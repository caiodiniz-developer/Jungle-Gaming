import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type {
  CreateOrderRequest,
  Network,
  Quote,
  QuoteChange,
  QuoteStaleDetails,
  User,
  Wallet,
  WalletProvider,
} from "@/api/contracts";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from "@/api/contracts";
import { createOrderSchema } from "@/api/schemas";
import { Breadcrumb } from "@/components/breadcrumb";
import { FormMessage, SelectField, TextField } from "@/components/form-fields";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { NftImage } from "@/components/nft-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallets } from "@/features/account/use-account";
import { useSession } from "@/features/auth/session";
import { QuoteSummary } from "@/features/cart/quote-summary";
import { useCart, useQuote } from "@/features/cart/use-cart";
import { clearOrderAttempt } from "@/features/checkout/order-attempt";
import { useConnectWallet, useDisconnectWallet, useSubmitOrder } from "@/features/checkout/use-checkout";
import { formatEthLabel, shortenHash } from "@/lib/eth";
import { applyApiError } from "@/lib/form-errors";
import type { ApiError } from "@/lib/http";
import { queryKeys } from "@/lib/query-keys";
import { useIsDesktop } from "@/lib/use-media-query";
import { useSessionKey } from "@/lib/use-session-token";
import { cn } from "@/lib/utils";

/** O formulário é o corpo do pedido sem a cotação, que vem do resumo revisado. */
const checkoutSchema = createOrderSchema.omit({ quoteHash: true });
type CheckoutValues = z.output<typeof checkoutSchema>;

const NETWORK_OPTIONS = Object.entries(NETWORK_LABELS).map(([value, label]) => ({ value, label }));
const PROVIDERS = Object.keys(WALLET_PROVIDER_LABELS) as WalletProvider[];

const API_FIELDS = [
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

type Connection = { walletId: string; provider: WalletProvider; network: Network };

function isQuoteStaleDetails(details: unknown): details is QuoteStaleDetails {
  return (
    typeof details === "object" &&
    details !== null &&
    "quote" in details &&
    "changes" in details &&
    Array.isArray(details.changes)
  );
}

function describeChange(change: QuoteChange): string {
  if (change.kind === "price") {
    return `O preço de ${change.name} mudou de ${change.from} para ${change.to}.`;
  }
  if (change.kind === "removed") return `${change.name} não está mais disponível.`;
  if (change.to === "0") return `${change.name} esgotou.`;
  return `A disponibilidade de ${change.name} mudou: agora há ${change.to} por pedido.`;
}

function RadioCard({
  checked,
  className,
  children,
  ...inputProps
}: React.ComponentProps<"input"> & { checked: boolean }) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 border px-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
        checked ? "border-primary" : "border-border hover:border-border-soft",
        className,
      )}
    >
      <input type="radio" className="absolute inset-0 size-full cursor-pointer opacity-0" {...inputProps} />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary" : "border-subtle",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      {children}
    </label>
  );
}

function OrderLines({ quote }: { quote: Quote }) {
  return (
    <ul className="flex flex-col gap-3">
      {quote.lines.map((line) => (
        <li key={line.id} className="flex items-center gap-3 bg-surface pr-3">
          <NftImage artwork={line.artwork} alt="" size={70} className="size-[70px] shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-base leading-5 font-bold">{line.name}</p>
            <p className="truncate text-sm leading-5 text-subtle">
              ID do token: #{line.tokenId} · {line.editionLabel}
            </p>
          </div>
          <p className="shrink-0 text-sm text-sand">
            <span aria-hidden="true">(x {line.quantity})</span>
            <span className="sr-only">Quantidade: {line.quantity}</span>
          </p>
          <p className="shrink-0 text-base leading-5 font-bold text-highlight lg:text-lg">
            {formatEthLabel(line.lineTotal)}
          </p>
        </li>
      ))}
    </ul>
  );
}

type CheckoutFormProps = {
  user: User;
  wallets: Wallet[];
  /** O carrinho ficou vazio (ex.: o pedido foi confirmado enquanto a resposta não chegava). */
  cartIsEmpty: boolean;
};

function CheckoutForm({ user, wallets, cartIsEmpty }: CheckoutFormProps) {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  const connect = useConnectWallet();
  const disconnect = useDisconnectWallet();
  const order = useSubmitOrder();

  const initialWallet = wallets.find((wallet) => wallet.kind === "primary") ?? wallets[0];

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      walletId: initialWallet?.id ?? "",
      provider: initialWallet?.provider ?? "metamask",
      network: initialWallet?.network ?? "ethereum",
      collector: {
        displayName: user.displayName,
        username: user.username,
        profileName: initialWallet?.profileName ?? user.displayName,
        email: user.email,
        referralCode: initialWallet?.referralCode ?? "",
        ensName: user.ensName,
        note: "",
      },
    },
  });
  const { errors } = form.formState;
  const [walletId, provider, network] = useWatch({
    control: form.control,
    name: ["walletId", "provider", "network"],
  });

  // o select permite voltar a "Selecione uma rede": a cotação segue na rede padrão até a escolha
  const validNetwork = network in NETWORK_LABELS;
  const quote = useQuote(validNetwork ? network : "ethereum");

  const walletField = form.register("walletId", {
    // a carteira escolhida traz sua rede e seu provedor; ambos seguem editáveis
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const wallet = wallets.find((item) => item.id === event.target.value);
      if (!wallet) return;
      form.setValue("network", wallet.network, { shouldValidate: true });
      form.setValue("provider", wallet.provider, { shouldValidate: true });
    },
  });

  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [stale, setStale] = useState<QuoteStaleDetails | null>(null);
  /** Corpo da última tentativa que falhou sem resposta definitiva: repetir reenvia exatamente ele. */
  const [retryBody, setRetryBody] = useState<CreateOrderRequest | null>(null);

  // a conexão vale para a combinação exata de carteira, provedor e rede
  const connected =
    connection !== null &&
    connection.walletId === walletId &&
    connection.provider === provider &&
    connection.network === network;
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);

  function handleConnect() {
    if (!selectedWallet) return;
    setConnectError(null);
    connect.mutate(
      { walletId, provider, network },
      {
        onSuccess: (result) => {
          setConnection(result);
          setFormError(null);
          toast.success("Carteira conectada.");
        },
        onError: (error) => {
          if (error.isAuthError) return;
          setConnectError(
            error.code === "WALLET_REJECTED"
              ? "A conexão foi recusada na carteira. Tente novamente ou escolha outra carteira."
              : error.message,
          );
        },
      },
    );
  }

  function handleOrderError(error: ApiError, body: CreateOrderRequest) {
    // 401: o SessionWatcher leva ao login e devolve o usuário a esta página
    if (error.isAuthError) return;

    if (error.code === "QUOTE_STALE" && isQuoteStaleDetails(error.details)) {
      // o resumo passa a mostrar os valores atuais e a compra exige nova confirmação
      queryClient.setQueryData(queryKeys.quote(sessionKey, body.network), error.details.quote);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(sessionKey) });
      setStale(error.details);
      return;
    }
    if (error.code === "AVAILABILITY_CONFLICT") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(sessionKey) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotes(sessionKey) });
      toast.warning("Há itens indisponíveis no carrinho.", {
        description: "Ajuste as quantidades para continuar a compra.",
      });
      void navigate({ to: "/carrinho" });
      return;
    }
    if (error.code === "WALLET_REJECTED") {
      setConnection(null);
      setFormError("A carteira não está conectada. Conecte-a novamente para confirmar a compra.");
      return;
    }
    if (error.code === "IDEMPOTENCY_CONFLICT") {
      // a chave guardada pertence a outro conteúdo: a próxima confirmação abre uma tentativa nova
      clearOrderAttempt();
      setFormError("Não foi possível enviar o pedido. Confira os dados e confirme novamente.");
      return;
    }
    if (error.isTransient) {
      // carrinho e formulário ficam como estão; a nova tentativa reusa a mesma chave de idempotência
      setRetryBody(body);
      return;
    }
    setFormError(applyApiError(error, form.setError, API_FIELDS));
  }

  function send(body: CreateOrderRequest) {
    // clique repetido enquanto envia não gera outra requisição
    if (order.isPending) return;
    setFormError(null);
    setStale(null);
    setRetryBody(null);
    order.mutate(body, {
      onSuccess: (created) =>
        void navigate({ to: "/pedidos/$orderId", params: { orderId: created.id }, replace: true }),
      onError: (error) => handleOrderError(error, body),
    });
  }

  const submit = form.handleSubmit((values) => {
    if (!quote.data?.purchasable) return;
    if (!connected) {
      setFormError("Conecte a carteira antes de confirmar a compra.");
      document.getElementById("conectar-carteira")?.focus();
      return;
    }
    send({ quoteHash: quote.data.hash, ...values });
  });

  // o pedido pode ter sido criado e concluído sem a resposta chegar: só resta repetir a tentativa
  const onlyRetry = cartIsEmpty && retryBody !== null;
  const blocked = quote.data !== undefined && !quote.data.purchasable;
  const canConfirm = !blocked && quote.data !== undefined && wallets.length > 0 && !onlyRetry;

  const confirmButton = (
    <Button
      type="submit"
      variant={isDesktop ? "default" : "pill"}
      size={isDesktop ? "lg" : "xl"}
      disabled={!canConfirm || order.isPending || quote.isFetching}
      className="w-full lg:rounded-lg"
    >
      {order.isPending ? "Enviando pedido…" : stale ? "Confirmar com os novos valores" : "Confirmar compra"}
    </Button>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-8 lg:flex-row lg:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section aria-labelledby="colecionador-titulo" className="flex flex-col gap-3">
          <h2 id="colecionador-titulo" className="text-[17px] leading-6 font-bold">
            Perfil do colecionador
          </h2>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <TextField
              label="Nome de exibição"
              required
              autoComplete="name"
              error={errors.collector?.displayName?.message}
              {...form.register("collector.displayName")}
            />
            <TextField
              label="Nome de usuário"
              required
              autoComplete="username"
              error={errors.collector?.username?.message}
              {...form.register("collector.username")}
            />
            <SelectField
              label="Rede"
              required
              placeholder="Selecione uma rede"
              options={NETWORK_OPTIONS}
              error={errors.network?.message}
              {...form.register("network")}
            />
            <TextField
              label="Nome do perfil"
              required
              error={errors.collector?.profileName?.message}
              {...form.register("collector.profileName")}
            />
            <TextField
              label="Código de indicação"
              required
              autoCapitalize="characters"
              error={errors.collector?.referralCode?.message}
              {...form.register("collector.referralCode")}
            />
            <TextField
              label="E-mail"
              required
              type="email"
              autoComplete="email"
              error={errors.collector?.email?.message}
              {...form.register("collector.email")}
            />
            <Controller
              control={form.control}
              name="collector.ensName"
              render={({ field }) => (
                <TextField
                  label="Nome ENS"
                  required
                  leading={
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-[78px] shrink-0 items-center rounded-sm border border-border px-2.5 text-[15px]"
                    >
                      .eth
                    </span>
                  }
                  placeholder="seunome"
                  autoCapitalize="none"
                  spellCheck={false}
                  error={errors.collector?.ensName?.message}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value.replace(/\.eth$/i, "")}
                  onChange={(event) => {
                    const ensLabel = event.target.value.trim().replace(/\.eth$/i, "");
                    field.onChange(ensLabel ? `${ensLabel}.eth` : "");
                  }}
                />
              )}
            />
          </div>
        </section>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 flex w-full items-center justify-between gap-4 text-[17px] leading-6 font-bold">
            Carteira de recebimento
            <Link to="/conta/carteiras" className="text-sm font-normal text-highlight hover:underline">
              Gerenciar carteiras
            </Link>
          </legend>
          {wallets.length === 0 ? (
            <p role="status" className="text-sm leading-6 text-sand">
              Você ainda não cadastrou uma carteira.{" "}
              <Link to="/conta/carteiras" className="font-bold text-highlight underline underline-offset-2">
                Cadastrar carteira
              </Link>{" "}
              para concluir a compra.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {wallets.map((wallet) => (
                <RadioCard
                  key={wallet.id}
                  value={wallet.id}
                  checked={wallet.id === walletId}
                  className="items-start rounded-[14px] bg-surface py-3 lg:rounded-sm"
                  {...walletField}
                >
                  <span className="flex min-w-0 flex-col text-sm leading-[22px] text-sand">
                    <span className="text-base font-bold text-foreground">{wallet.alias}</span>
                    <span className="truncate">{shortenHash(wallet.address)}</span>
                    <span>
                      {wallet.kind === "primary" ? "Carteira principal" : "Carteira secundária"} · Rede{" "}
                      {NETWORK_LABELS[wallet.network]}
                    </span>
                  </span>
                </RadioCard>
              ))}
            </div>
          )}
          {errors.walletId?.message && (
            <p role="alert" className="text-xs leading-4 text-coral">
              <span className="sr-only">Erro: </span>
              {errors.walletId.message}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col">
          <label htmlFor="observacao" className="flex min-h-[29px] items-center text-[15px] leading-none">
            Observação do colecionador (opcional)
          </label>
          <textarea
            id="observacao"
            rows={5}
            maxLength={280}
            aria-invalid={errors.collector?.note ? true : undefined}
            aria-describedby={errors.collector?.note ? "observacao-erro" : undefined}
            className="w-full rounded-sm border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-destructive md:max-w-[350px]"
            {...form.register("collector.note")}
          />
          {errors.collector?.note?.message && (
            <p id="observacao-erro" role="alert" className="mt-1.5 text-xs leading-4 text-coral">
              <span className="sr-only">Erro: </span>
              {errors.collector.note.message}
            </p>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-6 lg:w-[405px] lg:shrink-0">
        <section aria-labelledby="itens-titulo" className="flex flex-col gap-3">
          <h2 id="itens-titulo" className="text-[17px] leading-6 font-bold">
            Seus NFTs
          </h2>
          <div className="hairline" />
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
        </section>

        {stale && (
          <div role="alert" className="flex flex-col gap-2 rounded-sm border border-coral/60 bg-coral/10 p-3 text-sm leading-5">
            <p className="font-bold">Os valores mudaram desde a sua revisão.</p>
            {stale.changes.length > 0 && (
              <ul className="list-disc pl-5 text-sand">
                {stale.changes.map((change) => (
                  <li key={`${change.nftId}-${change.kind}`}>{describeChange(change)}</li>
                ))}
              </ul>
            )}
            <p>
              {stale.quote.purchasable
                ? `O novo total é ${formatEthLabel(stale.quote.total)}. Confira o resumo e confirme novamente.`
                : "Ajuste o carrinho para continuar."}
            </p>
          </div>
        )}

        {blocked && (
          <div role="status" className="flex flex-col items-start gap-2 text-sm leading-5 text-coral">
            <p>Há itens indisponíveis no carrinho.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/carrinho">Voltar ao carrinho</Link>
            </Button>
          </div>
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 w-full text-center text-[17px] leading-6 font-bold">Carteira e rede</legend>
          {PROVIDERS.map((item) => (
            <RadioCard
              key={item}
              value={item}
              checked={item === provider}
              className="h-[65px] rounded-[15px] bg-surface lg:h-[45px] lg:rounded-sm lg:bg-transparent"
              {...form.register("provider")}
            >
              <span className="text-[15px]">{WALLET_PROVIDER_LABELS[item]}</span>
            </RadioCard>
          ))}

          <div className="flex flex-col gap-2">
            {connected && selectedWallet ? (
              <p role="status" className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm leading-5 text-sand">
                <span>
                  <span className="font-bold text-foreground">Carteira conectada:</span> {selectedWallet.alias} ·{" "}
                  {WALLET_PROVIDER_LABELS[provider]} · {NETWORK_LABELS[network]}
                </span>
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() =>
                    disconnect.mutate(walletId, {
                      onSuccess: () => setConnection(null),
                      onError: (error) => !error.isAuthError && toast.error(error.message),
                    })
                  }
                  className="font-bold text-highlight underline underline-offset-2 disabled:opacity-50"
                >
                  Desconectar
                </button>
              </p>
            ) : (
              <Button
                id="conectar-carteira"
                variant="outline"
                onClick={handleConnect}
                disabled={!selectedWallet || !validNetwork || connect.isPending}
                className="w-full rounded-sm"
              >
                {connect.isPending ? "Aguardando a carteira…" : "Conectar carteira"}
              </Button>
            )}
            {connectError && !connected && (
              <p role="alert" className="text-xs leading-4 text-coral">
                <span className="sr-only">Erro: </span>
                {connectError}
              </p>
            )}
          </div>
        </fieldset>

        <FormMessage message={formError} />

        {retryBody && (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-sm border border-coral/60 bg-coral/10 p-3 text-sm leading-5">
            <p className="font-bold">Não recebemos a confirmação do envio.</p>
            <p className="text-sand">
              {order.error?.message} Tentar de novo é seguro: se o pedido já foi criado, ele será
              recuperado, sem cobrança em dobro.
            </p>
            <Button size="sm" disabled={order.isPending} onClick={() => send(retryBody)}>
              {order.isPending ? "Enviando pedido…" : "Tentar novamente"}
            </Button>
          </div>
        )}

        {isDesktop && confirmButton}
      </aside>

      {!isDesktop && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-[40px] bg-surface px-6 pt-5 pb-8 shadow-glow">
          <p className="flex items-baseline justify-end gap-4 text-base font-bold">
            Total:
            <span className="text-lg text-highlight">{quote.data ? formatEthLabel(quote.data.total) : "…"}</span>
          </p>
          {confirmButton}
        </div>
      )}
    </form>
  );
}

export function CheckoutPage() {
  const isDesktop = useIsDesktop();
  const { user } = useSession();
  const wallets = useWallets();
  const cart = useCart();

  const header = isDesktop ? (
    <Breadcrumb current="Pagamento" />
  ) : (
    <MobilePageHeader title="Pagamento com carteira" backTo="/carrinho" backLabel="Voltar ao carrinho" />
  );

  let content: React.ReactNode;
  if (wallets.isError || cart.isError) {
    const error = wallets.error ?? cart.error;
    content = (
      <div role="alert" className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-bold">Não foi possível carregar o pagamento</h2>
        <p className="text-sm leading-6 text-sand">{error?.message}</p>
        <Button
          onClick={() => {
            void wallets.refetch();
            void cart.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  } else if (!user || wallets.isPending || cart.isPending) {
    content = (
      <div role="status" aria-label="Carregando pagamento" className="flex flex-col gap-8 lg:flex-row">
        <div className="grid flex-1 gap-x-6 gap-y-3 md:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[69px]" />
          ))}
        </div>
        <Skeleton className="h-[420px] lg:w-[405px]" />
      </div>
    );
  } else {
    content = (
      // a chave recria o formulário ao trocar de conta
      <CheckoutGate key={user.id} user={user} wallets={wallets.data} cartIsEmpty={cart.data.lines.length === 0} />
    );
  }

  return (
    <div className="container-page flex flex-col gap-6 pt-8 pb-[190px] lg:pb-24">
      {header}
      {content}
    </div>
  );
}

/**
 * Com o carrinho vazio não há o que pagar — exceto se o formulário já estava em
 * uso: um pedido enviado pode ser confirmado (e esvaziar o carrinho) antes de a
 * resposta chegar, e a nova tentativa precisa continuar ao alcance.
 */
function CheckoutGate(props: CheckoutFormProps) {
  const [started, setStarted] = useState(!props.cartIsEmpty);
  if (!props.cartIsEmpty && !started) setStarted(true);

  if (!started) {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
        <p className="max-w-xl text-sm leading-6 text-sand">
          Adicione NFTs ao carrinho para seguir ao pagamento.
        </p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar o mercado
          </Link>
        </Button>
      </div>
    );
  }
  return <CheckoutForm {...props} />;
}
