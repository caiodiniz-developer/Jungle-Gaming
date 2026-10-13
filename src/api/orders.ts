import type { CreateOrderRequest, Order, OrderListResponse } from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

/**
 * Cria o pedido. A mesma `idempotencyKey` deve ser reenviada em novas tentativas
 * (clique repetido, timeout): o servidor devolve o pedido já criado em vez de duplicá-lo.
 */
export async function createOrder(
  body: CreateOrderRequest,
  idempotencyKey: string,
  options?: RequestOptions,
) {
  const { data } = await http.post<Order>("/orders", body, {
    ...options,
    headers: { ...options?.headers, "Idempotency-Key": idempotencyKey },
  });
  return data;
}

// busca um pedido pelo id
export async function getOrder(orderId: string, options?: RequestOptions) {
  const { data } = await http.get<Order>(`/orders/${encodeURIComponent(orderId)}`, options);
  return data;
}

// lista os pedidos do usuário
export async function listOrders(options?: RequestOptions) {
  const { data } = await http.get<OrderListResponse>("/orders", options);
  return data;
}
