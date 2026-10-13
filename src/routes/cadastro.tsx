import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/cadastro")({
  component: SignUpPage,
});

function SignUpPage() {
  return <PagePlaceholder title="Criar conta" description="Criação de conta, validação e tratamento de conflito." />;
}
