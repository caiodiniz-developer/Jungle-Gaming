import { useSyncExternalStore } from "react";
import { getSessionToken, subscribeSessionToken } from "@/lib/session-storage";
import { GUEST_SESSION_KEY } from "@/lib/query-keys";

/** Token da sessão atual, reativo a login, logout e mudanças em outra aba. */
export function useSessionToken(): string | null {
  return useSyncExternalStore(subscribeSessionToken, getSessionToken, () => null);
}

/** Parte da chave de cache que isola os dados por sessão. */
export function useSessionKey(): string {
  return useSessionToken() ?? GUEST_SESSION_KEY;
}
