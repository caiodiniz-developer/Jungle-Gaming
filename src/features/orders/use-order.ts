import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Order } from "@/api/contracts";
import { getOrder, listOrders } from "@/api/orders";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey } from "@/lib/use-session-token";
import { eventGate } from "@/realtime/gate";

/** Intervalo da consulta de reserva enquanto o pedido está pendente. */
const PENDING_POLL_MS = 4000;

/**
 * Pedido por id. O resultado normalmente chega pelo evento order.updated, mas
 * eventos podem se perder: enquanto o pedido estiver pendente a API também é
 * consultada periodicamente. Estados terminais encerram a consulta.
 */
export function useOrder(orderId: string) {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  const queryKey = queryKeys.order(sessionKey, orderId);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const order = await getOrder(orderId, { signal });
      eventGate.observe("order", order.id, order.version);
      // uma resposta que saiu antes de um evento mais novo não regride o estado
      const cached = queryClient.getQueryData<Order>(queryKey);
      return cached && cached.version > order.version ? cached : order;
    },
    refetchInterval: (query) => (query.state.data?.status === "pending" ? PENDING_POLL_MS : false),
  });
}

/** Pedidos do usuário, do mais recente ao mais antigo (Atividade e Arquivos baixados). */
export function useOrders() {
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: queryKeys.orders(sessionKey),
    queryFn: async ({ signal }) => (await listOrders({ signal })).items,
  });
}
