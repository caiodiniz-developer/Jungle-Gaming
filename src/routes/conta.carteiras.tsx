import { createFileRoute } from "@tanstack/react-router";
import { WalletsPage } from "@/features/account/wallets-page";

// rota /conta/carteiras
export const Route = createFileRoute("/conta/carteiras")({
  component: WalletsPage,
});
