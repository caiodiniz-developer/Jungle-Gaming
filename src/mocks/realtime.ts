/**
 * Servidor Socket.IO simulado.
 *
 * Transporte: o MSW intercepta o WebSocket aberto pelo socket.io-client e o
 * @mswjs/socket.io-binding codifica/decodifica os pacotes do protocolo. A
 * aplicação usa o socket.io-client real — os eventos nunca são entregues por
 * chamadas diretas à interface ou ao cache.
 *
 * Limitações do ambiente de mocks:
 * - só o transporte "websocket" (sem long-polling) e só o namespace "/";
 * - o binding não implementa salas nem heartbeat: o roteamento por usuário e os
 *   pings do Engine.IO são feitos aqui.
 */
import { toSocketIo } from "@mswjs/socket.io-binding";
import { ws } from "msw";
import type {
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  RealtimeEventType,
} from "@/api/contracts";
import { env } from "@/lib/env";
import { toNftSummary } from "@/mocks/domain/catalog";
import { commit, db } from "@/mocks/db";
import type { DbNft, DbOrder } from "@/mocks/types";

type ServerEvent = NftUpdatedEvent | OrderUpdatedEvent;

type Connection = {
  id: string;
  userId: string | null;
  emit: (type: RealtimeEventType, event: ServerEvent) => void;
  close: () => void;
  stopHeartbeat: () => void;
};

/** O handshake do binding anuncia pingInterval de 25 s e pingTimeout de 5 s. */
const HEARTBEAT_MS = 20_000;
// pacote de ping do Engine.IO
const ENGINE_IO_PING = "2";

// conexões abertas
const connections = new Map<string, Connection>();
// eventos já emitidos
const eventLog: ServerEvent[] = [];
let accepting = true;

// o MSW remove o prefixo "/socket.io/" do caminho antes de comparar, então o
// link aponta para a raiz da origem
const socketOrigin = (env.socketUrl || window.location.origin).replace(/^http/, "ws");
// ponto de interceptação do WebSocket
const link = ws.link(socketOrigin);

// handler das conexões Socket.IO
export const realtimeHandlers = [
  link.addEventListener("connection", (connection) => {
    // outros WebSockets da mesma origem (ex.: HMR do Vite) seguem para o servidor real
    if (!connection.client.url.pathname.startsWith("/socket.io")) {
      connection.server.connect();
      return;
    }

    if (!accepting) {
      // simula servidor fora do ar: o cliente entra em tentativa de reconexão
      connection.client.close();
      return;
    }

    const io = toSocketIo(connection);
    const heartbeat = window.setInterval(() => connection.client.send(ENGINE_IO_PING), HEARTBEAT_MS);

    const entry: Connection = {
      id: connection.client.id,
      userId: null,
      emit: (type, event) => io.client.emit(type, event),
      close: () => connection.client.close(),
      stopHeartbeat: () => window.clearInterval(heartbeat),
    };
    connections.set(entry.id, entry);

    io.client.on("session.join", (_event, payload: { token?: string }) => {
      const session = db().sessions.find(
        (item) => item.token === payload?.token && item.expiresAt > Date.now(),
      );
      entry.userId = session?.userId ?? null;
    });

    io.client.on("session.leave", () => {
      entry.userId = null;
    });

    connection.client.addEventListener("close", () => {
      entry.stopHeartbeat();
      connections.delete(entry.id);
    });
  }),
];

// entrega o evento às conexões certas
function deliver(event: ServerEvent) {
  for (const connection of connections.values()) {
    // eventos privados só chegam às conexões associadas ao dono do recurso
    if (event.userId && connection.userId !== event.userId) continue;
    connection.emit(event.type, event);
  }
}

// guarda o evento no histórico
function record(event: ServerEvent) {
  eventLog.push(event);
  if (eventLog.length > 100) eventLog.shift();
}

// próximo id de evento
function nextEventId(): string {
  const current = db();
  current.counters.event += 1;
  commit();
  return `evt_${String(current.counters.event).padStart(6, "0")}`;
}

// emite nft.updated
export function emitNftUpdated(nft: DbNft): NftUpdatedEvent {
  const event: NftUpdatedEvent = {
    id: nextEventId(),
    type: "nft.updated",
    resource: { type: "nft", id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: { nft: toNftSummary(nft), editions: structuredClone(nft.editions) },
  };
  record(event);
  deliver(event);
  return event;
}

// emite order.updated
export function emitOrderUpdated(order: DbOrder, publicOrder: Order): OrderUpdatedEvent {
  const event: OrderUpdatedEvent = {
    id: nextEventId(),
    type: "order.updated",
    resource: { type: "order", id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    userId: order.userId,
    data: { order: publicOrder },
  };
  record(event);
  deliver(event);
  return event;
}

// ───────────── Controles usados pelo painel de cenários e pelos testes ─────────────

/** Reenvia um evento já emitido, com o mesmo `id` (duplicata). Sem `eventId`, reenvia o último. */
export function replayEvent(eventId?: string): ServerEvent | null {
  const event = eventId ? eventLog.find((item) => item.id === eventId) : eventLog.at(-1);
  if (!event) return null;
  deliver(event);
  return event;
}

/** Entrega um evento arbitrário, sem alterar o banco (ex.: evento antigo, com versão menor). */
export function emitRaw(event: ServerEvent) {
  deliver(event);
}

// histórico de eventos
export function getEventLog(): ServerEvent[] {
  return [...eventLog];
}

/** Derruba todas as conexões. Com `refuseNew`, recusa reconexões até `restoreConnections`. */
export function dropConnections({ refuseNew = false } = {}) {
  accepting = !refuseNew;
  for (const connection of [...connections.values()]) connection.close();
}

// volta a aceitar conexões
export function restoreConnections() {
  accepting = true;
}

// número de conexões abertas
export function connectionCount(): number {
  return connections.size;
}
