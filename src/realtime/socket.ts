import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/api/contracts";
import { env } from "@/lib/env";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: Promise<AppSocket> | null = null;

/**
 * Conexão única da aplicação com o servidor de eventos.
 *
 * O socket.io-client é carregado sob demanda, na primeira chamada. Dois motivos:
 * - ele guarda a referência de `WebSocket` quando o módulo é avaliado, e isso
 *   precisa acontecer depois de a camada de mocks (MSW) ter substituído o global;
 * - fora do caminho crítico, o código da aplicação pode ser baixado em paralelo
 *   com os mocks, e a primeira pintura não espera a biblioteca de tempo real.
 *
 * Só o transporte "websocket" é usado: é o que os mocks interceptam, e dispensa
 * a etapa de long-polling do handshake.
 */
export function getSocket(): Promise<AppSocket> {
  socket ??= import("socket.io-client").then(
    ({ io }): AppSocket =>
      io(env.socketUrl || window.location.origin, {
        path: "/socket.io",
        transports: ["websocket"],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
      }),
  );
  return socket;
}
