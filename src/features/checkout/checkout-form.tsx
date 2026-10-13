import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { User, Wallet, WalletProvider } from "@/api/contracts";
import { NETWORK_LABELS } from "@/api/contracts";
import { FormMessage } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { QuoteSummary } from "@/features/cart/quote-summary";
import { useQuote } from "@/features/cart/use-cart";
import { checkoutDefaults, checkoutSchema, type CheckoutValues } from "@/features/checkout/checkout-schema";
import { CollectorFields, CollectorNote } from "@/features/checkout/collector-fields";
import {
  BlockedNotice,
  OrderLines,
  QuoteChangedNotice,
  RetryNotice,
} from "@/features/checkout/order-review";
import { ConnectionRow, ProviderOptions } from "@/features/checkout/provider-options";
import { useOrderSubmission } from "@/features/checkout/use-order-submission";
import { useQuoteReview } from "@/features/checkout/use-quote-review";
import { useWalletConnection } from "@/features/checkout/use-wallet-connection";
import { OtherWalletToggle, WalletCards } from "@/features/checkout/wallet-picker";
import { formatEthLabel } from "@/lib/eth";
import { useIsDesktop } from "@/lib/use-media-query";

export type CheckoutFormProps = {
  user: User;
  wallets: Wallet[];
  /** O carrinho ficou vazio (ex.: o pedido foi confirmado enquanto a resposta não chegava). */
  cartIsEmpty: boolean;
};

/**
 * Formulário de pagamento. Compõe as partes da tela e liga três estados:
 * a cotação revisada, a conexão da carteira e o envio do pedido.
 */
export function CheckoutForm({ user, wallets, cartIsEmpty }: CheckoutFormProps) {
  const isDesktop = useIsDesktop();
  const primaryWallet = wallets.find((wallet) => wallet.kind === "primary") ?? wallets[0];

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: checkoutDefaults(user, primaryWallet),
  });
  const [walletId, provider, network] = useWatch({
    control: form.control,
    name: ["walletId", "provider", "network"],
  });
  const wallet = wallets.find((item) => item.id === walletId);

  // o select permite voltar a "Selecione uma rede": a cotação segue na rede padrão até a escolha
  const validNetwork = network in NETWORK_LABELS;
  const quote = useQuote(validNetwork ? network : "ethereum");
  const review = useQuoteReview(quote.data);
  const connection = useWalletConnection({ walletId, provider, network });
  const submission = useOrderSubmission({ form, onWalletRejected: connection.reset });

  // mobile: os dados do colecionador ficam recolhidos e abrem quando há erro neles
  const [detailsOpen, setDetailsOpen] = useState(false);

  /** A carteira escolhida traz sua rede e seu provedor; ambos seguem editáveis. */
  function selectWallet(next: Wallet) {
    form.setValue("walletId", next.id, { shouldValidate: true });
    form.setValue("network", next.network, { shouldValidate: true });
    form.setValue("provider", next.provider, { shouldValidate: true });
  }

  const selectProvider = (next: WalletProvider) => form.setValue("provider", next, { shouldValidate: true });

  const submit = form.handleSubmit(
    (values) => {
      if (!quote.data?.purchasable) return;
      if (!connection.connected) {
        submission.setFormError("Conecte a carteira antes de confirmar a compra.");
        document.getElementById("conectar-carteira")?.focus();
        return;
      }
      review.accept();
      submission.send({ quoteHash: quote.data.hash, ...values });
    },
    () => setDetailsOpen(true),
  );

  // o pedido pode ter sido criado e concluído sem a resposta chegar: só resta repetir a tentativa
  const onlyRetry = cartIsEmpty && submission.retryBody !== null;
  const blocked = quote.data !== undefined && !quote.data.purchasable;
  const canConfirm = !blocked && quote.data !== undefined && wallets.length > 0 && !onlyRetry;
  const needsReconfirmation = submission.stale !== null || review.changed;

  const confirmButton = (
    <Button
      type="submit"
      variant={isDesktop ? "default" : "pill"}
      size={isDesktop ? "lg" : "xl"}
      disabled={!canConfirm || submission.isSending || quote.isFetching}
      className="w-full lg:rounded-lg"
    >
      {submission.isSending
        ? "Enviando pedido…"
        : needsReconfirmation
          ? "Confirmar com os novos valores"
          : "Confirmar compra"}
    </Button>
  );

  const providerSection = (
    <>
      <ProviderOptions value={provider} onChange={selectProvider} compact={!isDesktop} />
      <ConnectionRow
        connection={connection}
        wallet={wallet}
        provider={provider}
        network={network}
        canConnect={validNetwork}
        onConnected={() => submission.setFormError(null)}
      />
    </>
  );

  const notices = (
    <>
      {needsReconfirmation && quote.data && (
        <QuoteChangedNotice stale={submission.stale} quote={quote.data} previousTotal={review.previousTotal} />
      )}
      {blocked && <BlockedNotice />}
      <FormMessage message={submission.formError} />
      {submission.retryBody && (
        <RetryNotice
          body={submission.retryBody}
          message={submission.retryMessage}
          isSending={submission.isSending}
          onRetry={submission.send}
        />
      )}
    </>
  );

  const summary = (
    <>
      {quote.data && <OrderLines quote={quote.data} />}
      <Link to="/carrinho" className="text-center text-sm text-foreground hover:text-highlight">
        Tem um código promocional? Aplique aqui
      </Link>
      <QuoteSummary
        quote={quote.data}
        error={quote.error}
        onRetry={() => void quote.refetch()}
        updating={quote.isFetching}
      />
    </>
  );

  if (!isDesktop) {
    return (
      <form onSubmit={submit} noValidate className="flex flex-col gap-7">
        <WalletCards
          wallets={wallets}
          selectedId={walletId}
          onSelect={selectWallet}
          error={form.formState.errors.walletId?.message}
        />
        {providerSection}
        {notices}

        <details
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          className="rounded-[14px] bg-surface px-4 py-3"
        >
          <summary className="cursor-pointer text-base leading-6 font-bold">Dados do colecionador e itens</summary>
          <div className="flex flex-col gap-6 pt-4">
            <CollectorFields form={form} />
            <CollectorNote form={form} />
            <section aria-label="Seus NFTs" className="flex flex-col gap-3">
              {summary}
            </section>
          </div>
        </details>

        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-[40px] bg-surface px-7 pt-5 pb-8 shadow-glow">
          <p className="flex items-baseline justify-end gap-7 text-base font-bold">
            Total:
            <span data-testid="checkout-total" className="text-lg text-highlight">
              {quote.data ? formatEthLabel(quote.data.total) : "…"}
            </span>
          </p>
          {confirmButton}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex items-start gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <section aria-labelledby="colecionador-titulo" className="flex flex-col gap-3">
          <h2 id="colecionador-titulo" className="text-[17px] leading-6 font-bold">
            Perfil do colecionador
          </h2>
          <CollectorFields form={form} wallet={wallet} />
        </section>
        <OtherWalletToggle
          wallets={wallets}
          selectedId={walletId}
          onSelect={selectWallet}
          error={form.formState.errors.walletId?.message}
        />
        <CollectorNote form={form} />
      </div>

      <aside className="flex w-[405px] shrink-0 flex-col gap-6">
        <section aria-labelledby="itens-titulo" className="flex flex-col gap-3">
          <h2 id="itens-titulo" className="text-[17px] leading-6 font-bold">
            Seus NFTs
          </h2>
          <p aria-hidden="true" className="flex justify-between border-b border-primary/50 pb-2.5 text-base font-medium">
            <span>NFTs</span>
            <span>Subtotal</span>
          </p>
          {summary}
        </section>
        {notices}
        {providerSection}
        {confirmButton}
      </aside>
    </form>
  );
}
