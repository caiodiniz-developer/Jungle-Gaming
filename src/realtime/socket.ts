import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/api/contracts";
import { env } from "@/lib/env";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Conexão única da aplicação com o servidor de eventos.
 * Só o transporte "websocket" é usado: é o que a camada de mocks intercepta, e
 * dispensa a etapa de long-polling do handshake.
 */
export function getSocket(): AppSocket {
  socket ??= io(env.socketUrl || window.location.origin, {
    path: "/socket.io",
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
  return socket;
}
