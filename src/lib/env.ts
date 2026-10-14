const raw = import.meta.env;

export const env = {
  /** Prefixo das rotas REST. */
  apiUrl: raw.VITE_API_URL ?? "/api",
  /** Origem do servidor Socket.IO; vazio = mesma origem da aplicação. */
  socketUrl: raw.VITE_SOCKET_URL ?? "",
  /** Liga a camada de mocks (MSW). Ativa por padrão: a entrega roda sem backend. */
  enableMocks: (raw.VITE_ENABLE_MOCKS ?? "true") !== "false",
  /** Tempo limite padrão das requisições, em ms. */
  requestTimeout: Number(raw.VITE_REQUEST_TIMEOUT ?? 10_000),
} as const;

/** Verdadeiro na pré-renderização do build (Node), onde só a primeira dobra é gerada. */
export const isPrerender = typeof window === "undefined";
