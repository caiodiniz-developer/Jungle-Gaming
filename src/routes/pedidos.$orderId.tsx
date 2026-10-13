import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";
import { requireSession } from "@/features/auth/guards";

export const Route = createFileRoute("/pedidos/$orderId")({
  beforeLoad: requireSession,
  component: OrderPage,
});

function OrderPage() {
  return <PagePlaceholder title="Confirmação de pedido" description="Resultado, identificação da transação, itens, taxas e total." />;
}
