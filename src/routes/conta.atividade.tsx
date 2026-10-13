import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage } from "@/features/account/activity-page";

// rota /conta/atividade
export const Route = createFileRoute("/conta/atividade")({
  component: ActivityPage,
});
