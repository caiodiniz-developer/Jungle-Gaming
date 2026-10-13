import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { User, Wallet } from "@/api/contracts";
import { createOrderSchema } from "@/api/schemas";

/** O formulário é o corpo do pedido sem a cotação, que vem do resumo revisado. */
export const checkoutSchema = createOrderSchema.omit({ quoteHash: true });

export type CheckoutValues = z.output<typeof checkoutSchema>;
export type CheckoutForm = UseFormReturn<CheckoutValues>;

/** Campos que a API pode apontar como inválidos (caminhos do formulário). */
export const CHECKOUT_API_FIELDS = [
  "collector.displayName",
  "collector.username",
  "collector.profileName",
  "collector.email",
  "collector.referralCode",
  "collector.ensName",
  "collector.note",
  "walletId",
  "provider",
  "network",
] as const;

/** Valores iniciais: dados do perfil e da carteira principal, todos editáveis. */
export function checkoutDefaults(user: User, wallet: Wallet | undefined): CheckoutValues {
  return {
    walletId: wallet?.id ?? "",
    provider: wallet?.provider ?? "metamask",
    network: wallet?.network ?? "ethereum",
    collector: {
      displayName: user.displayName,
      username: user.username,
      profileName: wallet?.profileName ?? user.displayName,
      email: user.email,
      referralCode: wallet?.referralCode ?? "",
      ensName: user.ensName,
      note: "",
    },
  };
}
