import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage } from "@/features/account/activity-page";

export const Route = createFileRoute("/conta/atividade")({
  component: ActivityPage,
});
