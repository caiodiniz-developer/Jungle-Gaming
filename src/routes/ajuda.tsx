import { createFileRoute } from "@tanstack/react-router";
import { HelpPage } from "@/features/editorial/help-page";

// rota /ajuda
export const Route = createFileRoute("/ajuda")({
  component: HelpPage,
});
