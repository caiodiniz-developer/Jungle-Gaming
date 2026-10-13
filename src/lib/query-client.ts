import { QueryClient } from "@tanstack/react-query";
import { type ApiError, toApiError } from "@/lib/http";

declare module "@tanstack/react-query" {
  interface Register {
    // toda falha de consulta ou mutation chega como ApiError (ver lib/http.ts)
    defaultError: ApiError;
  }
}

/**
 * Política de cache e novas tentativas (documentada em ARCHITECTURE.md):
 * - dados ficam "frescos" por 30 s; depois disso são revalidados em segundo plano;
 * - consultas repetem até 2 vezes apenas em falhas transitórias (rede, timeout, 5xx);
 *   erros 4xx não melhoram com repetição;
 * - mutations nunca são repetidas automaticamente: quem decide é a interface,
 *   e o pedido usa chave de idempotência para repetir com segurança.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => toApiError(error).isTransient && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      },
      mutations: { retry: false },
    },
  });
}
