import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession, login, logout, register } from "@/api/auth";
import type { Session, User } from "@/api/contracts";
import { PRIVATE_QUERY_PREFIXES, queryKeys } from "@/lib/query-keys";
import {
  getGuestCartId,
  getSessionToken,
  resetGuestCartId,
  setSessionToken,
} from "@/lib/session-storage";
import { useSessionToken } from "@/lib/use-session-token";
import { eventGate } from "@/realtime/gate";

/**
 * Remove do cache tudo que pertence a um usuário e esquece os eventos já
 * vistos. Chamado ao sair, ao expirar a sessão e antes de entrar com outra
 * conta, para que nenhum dado privado da sessão anterior seja reaproveitado.
 */
export function clearPrivateData(queryClient: QueryClient) {
  for (const prefix of PRIVATE_QUERY_PREFIXES) {
    void queryClient.cancelQueries({ queryKey: [prefix] });
    queryClient.removeQueries({ queryKey: [prefix] });
  }
  eventGate.reset();
}

/** Grava a sessão recém-aberta: token persistido, usuário no cache, carrinho de visitante encerrado. */
function startSession(queryClient: QueryClient, session: Session) {
  clearPrivateData(queryClient);
  // o carrinho do visitante foi incorporado à conta pela API; o próximo visitante começa do zero
  resetGuestCartId();
  setSessionToken(session.token);
  queryClient.setQueryData(queryKeys.session(session.token), session);
}

// encerra a sessão local e limpa os dados privados
export function endSession(queryClient: QueryClient) {
  setSessionToken(null);
  clearPrivateData(queryClient);
}

/**
 * Sessão atual. Com um token guardado, consulta a API para recuperar o usuário
 * (refresh da página); sem token, não há requisição.
 */
export function useSession() {
  const token = useSessionToken();
  const query = useQuery({
    queryKey: queryKeys.session(token ?? ""),
    queryFn: ({ signal }) => getSession({ signal }),
    enabled: token !== null,
    staleTime: 5 * 60_000,
  });

  return {
    token,
    user: token ? (query.data?.user ?? null) : null,
    isAuthenticated: token !== null,
    /** Há token, mas o usuário ainda está sendo recuperado. */
    isRestoring: token !== null && query.isPending,
  };
}

/** Atualiza o usuário em cache após editar o perfil. */
export function useUpdateCachedUser() {
  const queryClient = useQueryClient();
  return (user: User) => {
    const token = getSessionToken();
    if (!token) return;
    queryClient.setQueryData<Session>(queryKeys.session(token), (session) =>
      session ? { ...session, user } : session,
    );
  };
}

// login
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      login({ ...body, guestCartId: getSessionToken() ? undefined : getGuestCartId() }),
    onSuccess: (session) => startSession(queryClient, session),
  });
}

// cadastro
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; email: string; password: string }) =>
      register({ ...body, guestCartId: getSessionToken() ? undefined : getGuestCartId() }),
    onSuccess: (session) => startSession(queryClient, session),
  });
}

// logout
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    // sair nunca fica preso a uma falha de rede: a sessão local é encerrada de qualquer forma
    onSettled: () => endSession(queryClient),
  });
}
