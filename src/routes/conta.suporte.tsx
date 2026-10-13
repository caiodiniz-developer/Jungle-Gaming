import { createFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/features/account/support-page";

export const Route = createFileRoute("/conta/suporte")({
  component: SupportPage,
});
