import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthScreen } from "@/features/auth/auth-screen";
import { redirectIfSignedIn } from "@/features/auth/guards";

export const Route = createFileRoute("/cadastro")({
  // destino após autenticar: volta ao fluxo em que o usuário estava
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: redirectIfSignedIn,
  component: SignUpPage,
});

// tela de cadastro
function SignUpPage() {
  const { redirect } = Route.useSearch();
  return <AuthScreen mode="register" redirect={redirect} />;
}
