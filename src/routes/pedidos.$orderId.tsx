import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/pedidos/$orderId")({
  component: OrderPage,
});

function OrderPage() {
  return <PagePlaceholder title="Confirmação de pedido" description="Resultado, identificação da transação, itens, taxas e total." />;
}
