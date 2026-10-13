import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/carrinho")({
  component: CartPage,
});

function CartPage() {
  return <PagePlaceholder title="Carrinho de NFTs" description="Edição de quantidades, remoção, cupom e resumo de valores." />;
}
