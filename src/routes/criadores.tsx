import { createFileRoute } from "@tanstack/react-router";
import { CreatorsPage } from "@/features/editorial/creators-page";

// rota /criadores
export const Route = createFileRoute("/criadores")({
  component: CreatorsPage,
});
