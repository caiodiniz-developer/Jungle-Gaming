import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/features/auth/guards";
import { OrderPage } from "@/features/orders/order-page";

// rota /pedidos/$orderId
export const Route = createFileRoute("/pedidos/$orderId")({
  beforeLoad: requireSession,
  component: OrderRoute,
});

// lê o id da URL e mostra o pedido
function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderPage orderId={orderId} />;
}
