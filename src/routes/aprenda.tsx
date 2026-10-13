import { createFileRoute } from "@tanstack/react-router";
import { LearnPage } from "@/features/editorial/learn-page";

// rota /aprenda
export const Route = createFileRoute("/aprenda")({
  component: LearnPage,
});
