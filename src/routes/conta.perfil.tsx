import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/conta/perfil")({
  component: ProfilePage,
});

function ProfilePage() {
  return <PagePlaceholder title="Perfil do colecionador" description="Edição dos dados, avatar e alteração de senha." />;
}
