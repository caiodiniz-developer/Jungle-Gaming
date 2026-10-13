import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { ApiErrorBody, ApiErrorCode } from "@/api/contracts";
import { env } from "@/lib/env";
import { getGuestCartId, getSessionToken } from "@/lib/session-storage";

/** Falhas que não chegam a ter resposta HTTP. */
export type TransportErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "CANCELED";

/**
 * Erro único da camada HTTP. Toda falha — resposta 4xx/5xx, rede, timeout —
 * chega à interface neste formato, com um `code` estável para decidir o que exibir.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | TransportErrorCode;
  readonly fields: Record<string, string>;
  readonly details: unknown;

  constructor(options: {
    status: number;
    code: ApiErrorCode | TransportErrorCode;
    message: string;
    fields?: Record<string, string>;
    details?: unknown;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields ?? {};
    this.details = options.details;
  }

  /** Falhas em que repetir a mesma requisição pode funcionar. */
  get isTransient(): boolean {
    return (
      this.code === "NETWORK_ERROR" ||
      this.code === "TIMEOUT" ||
      this.code === "SERVICE_UNAVAILABLE" ||
      this.status >= 500
    );
  }

  get isAuthError(): boolean {
    return this.code === "UNAUTHENTICATED" || this.code === "SESSION_EXPIRED";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === "object" && data !== null && "code" in data && "message" in data;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError({ status: 0, code: "CANCELED", message: "Requisição cancelada." });
  }

  if (error instanceof AxiosError) {
    if (error.response) {
      const { status, data } = error.response;
      if (isErrorBody(data)) {
        return new ApiError({ status, ...data });
      }
      return new ApiError({
        status,
        code: status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR",
        message: "Não foi possível concluir a operação.",
      });
    }
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: "O servidor demorou para responder. Tente novamente.",
      });
    }
    return new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    });
  }

  return new ApiError({
    status: 0,
    code: "NETWORK_ERROR",
    message: error instanceof Error ? error.message : "Erro inesperado.",
  });
}

type SessionExpiredHandler = (error: ApiError) => void;
let onSessionExpired: SessionExpiredHandler | null = null;

/** Registrado pela camada de sessão para reagir a um 401 em qualquer chamada. */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  onSessionExpired = handler;
}

export const http = axios.create({
  baseURL: env.apiUrl,
  // o adaptador fetch implementa o timeout com temporizador + AbortSignal,
  // o que permite cancelar consultas obsoletas e controlar o relógio nos testes
  adapter: "fetch",
  timeout: env.requestTimeout,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    // visitante: o carrinho é identificado por um id local até o login
    config.headers.set("X-Cart-Id", getGuestCartId());
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const sentToken = error instanceof AxiosError && error.config?.headers.has("Authorization");
    if (apiError.isAuthError && sentToken) onSessionExpired?.(apiError);
    return Promise.reject(apiError);
  },
);

export type RequestOptions = Pick<AxiosRequestConfig, "signal" | "timeout" | "headers">;
