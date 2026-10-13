import { createFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/features/account/support-page";

// rota /conta/suporte
export const Route = createFileRoute("/conta/suporte")({
  component: SupportPage,
});
