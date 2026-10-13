import { createFileRoute } from "@tanstack/react-router";
import { OffersPage } from "@/features/account/offers-page";

// rota /conta/ofertas
export const Route = createFileRoute("/conta/ofertas")({
  component: OffersPage,
});
