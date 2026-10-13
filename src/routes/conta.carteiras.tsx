import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/conta/carteiras")({
  component: WalletsPage,
});

function WalletsPage() {
  return <PagePlaceholder title="Carteiras" description="Cadastro e edição de carteiras principal e secundária." />;
}
