import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <PagePlaceholder title="Início" description="Destaques, catálogo, busca, filtros e ordenação." />;
}
