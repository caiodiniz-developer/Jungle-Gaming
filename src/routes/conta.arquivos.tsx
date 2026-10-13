import { createFileRoute } from "@tanstack/react-router";
import { DownloadsPage } from "@/features/account/downloads-page";

// rota /conta/arquivos
export const Route = createFileRoute("/conta/arquivos")({
  component: DownloadsPage,
});
