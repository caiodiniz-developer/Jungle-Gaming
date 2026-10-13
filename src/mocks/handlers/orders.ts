import type { OrderListResponse } from "@/api/contracts";
import { createOrderSchema } from "@/api/schemas";
import { db } from "@/mocks/db";
import { createOrder, toPublicOrder } from "@/mocks/domain/orders";
import { fail, json, readBody, requireUser, route } from "@/mocks/http";

// rotas de pedidos
export const orderHandlers = [
  route("post", "/orders", async ({ request }) => {
    const user = requireUser(request);
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      fail(422, "VALIDATION_ERROR", "O cabeçalho Idempotency-Key é obrigatório.");
    }

    const body = await readBody(request, createOrderSchema);
    const { order, replayed } = createOrder(user, body, idempotencyKey);
    // 202: o pedido foi aceito e segue pendente; 200: tentativa repetida, mesmo pedido
    return json(toPublicOrder(order), replayed ? 200 : 202);
  }),

  route("get", "/orders", ({ request }) => {
    const user = requireUser(request);
    const items = db()
      .orders.filter((order) => order.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toPublicOrder);
    return json<OrderListResponse>({ items });
  }),

  route("get", "/orders/:orderId", ({ request, params }) => {
    const user = requireUser(request);
    const order = db().orders.find((item) => item.id === params.orderId);
    if (!order) fail(404, "NOT_FOUND", "Pedido não encontrado.");
    if (order.userId !== user.id) {
      fail(403, "FORBIDDEN", "Este pedido pertence a outra conta.");
    }
    return json(toPublicOrder(order));
  }),
];
