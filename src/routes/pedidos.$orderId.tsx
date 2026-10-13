import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/features/auth/guards";
import { OrderPage } from "@/features/orders/order-page";

export const Route = createFileRoute("/pedidos/$orderId")({
  beforeLoad: requireSession,
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderPage orderId={orderId} />;
}
