import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/pagamento")({
  component: CheckoutPage,
});

function CheckoutPage() {
  return <PagePlaceholder title="Pagamento" description="Dados do colecionador, seleção de carteira e rede, revisão e envio do pedido." />;
}
