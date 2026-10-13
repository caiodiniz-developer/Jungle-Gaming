import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/entrar")({
  component: SignInPage,
});

function SignInPage() {
  return <PagePlaceholder title="Entrar" description="Autenticação, validação e retorno ao fluxo anterior." />;
}
