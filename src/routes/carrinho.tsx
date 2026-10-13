import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/features/cart/cart-page";

// rota /carrinho
export const Route = createFileRoute("/carrinho")({
  component: CartPage,
});
