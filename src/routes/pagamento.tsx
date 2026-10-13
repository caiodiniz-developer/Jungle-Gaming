import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/features/auth/guards";
import { CheckoutPage } from "@/features/checkout/checkout-page";

// rota /pagamento
export const Route = createFileRoute("/pagamento")({
  beforeLoad: requireSession,
  component: CheckoutPage,
});
