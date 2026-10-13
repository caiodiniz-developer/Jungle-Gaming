import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";
import { requireSession } from "@/features/auth/guards";

export const Route = createFileRoute("/pagamento")({
  beforeLoad: requireSession,
  component: CheckoutPage,
});

function CheckoutPage() {
  return <PagePlaceholder title="Pagamento" description="Dados do colecionador, seleção de carteira e rede, revisão e envio do pedido." />;
}
