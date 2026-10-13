import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConnectWalletRequest, CreateOrderRequest, Order } from "@/api/contracts";
import { createOrder } from "@/api/orders";
import { connectWallet } from "@/api/wallets";
import { clearOrderAttempt, idempotencyKeyFor } from "@/features/checkout/order-attempt";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey } from "@/lib/use-session-token";
import { eventGate } from "@/realtime/gate";

/** Pede a conexão à carteira (simulada); pode ser recusada com 403 WALLET_REJECTED. */
export function useConnectWallet() {
  return useMutation({
    mutationFn: ({ walletId, ...body }: ConnectWalletRequest & { walletId: string }) =>
      connectWallet(walletId, body),
  });
}

/**
 * Envia o pedido com a chave de idempotência da tentativa. Repetir a chamada
 * com o mesmo corpo é seguro: a API devolve o mesmo pedido.
 */
export function useSubmitOrder() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  return useMutation({
    mutationFn: (body: CreateOrderRequest) => createOrder(body, idempotencyKeyFor(body)),
    onSuccess: (order) => {
      clearOrderAttempt();
      eventGate.observe("order", order.id, order.version);
      // um order.updated pode ter chegado antes desta resposta: o estado mais novo fica
      queryClient.setQueryData<Order>(queryKeys.order(sessionKey, order.id), (cached) =>
        cached && cached.version > order.version ? cached : order,
      );
    },
  });
}
