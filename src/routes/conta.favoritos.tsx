import { createFileRoute } from "@tanstack/react-router";
import { WishlistPage } from "@/features/account/wishlist-page";

// rota /conta/favoritos
export const Route = createFileRoute("/conta/favoritos")({
  component: WishlistPage,
});
