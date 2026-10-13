import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { Cart, CartLine } from "@/api/contracts";
import { couponSchema } from "@/api/schemas";
import trashIcon from "@/assets/icons/trash.svg";
import { Breadcrumb } from "@/components/breadcrumb";
import { Icon } from "@/components/icon";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { NftImage } from "@/components/nft-image";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteSummary } from "@/features/cart/quote-summary";
import {
  useApplyCoupon,
  useCart,
  useIsCartMutating,
  useQuote,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from "@/features/cart/use-cart";
import { useNftList } from "@/features/catalog/use-nfts";
import { RelatedCarousel } from "@/features/nft/related-carousel";
import { formatEthLabel } from "@/lib/eth";
import { useIsDesktop } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { FlashOnChange } from "@/components/flash-on-change";

/** Colunas da tabela desktop: imagem, NFT, preço, edições, total, remover. */
const COLUMNS = "lg:grid-cols-[70px_minmax(0,1fr)_100px_100px_110px_24px] lg:gap-x-4 lg:pr-4";

// uma linha do carrinho
function CartLineRow({ line }: { line: CartLine }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const unavailable = line.status === "unavailable";

  const setQuantity = (quantity: number) =>
    update.mutate(
      { lineId: line.id, quantity },
      { onError: (error) => toast.error(error.message) },
    );

  const removeLine = () => remove.mutate({ lineId: line.id, name: line.name });

  return (
    <li
      data-testid="cart-line"
      className="animate-rise overflow-hidden rounded-[14px] bg-surface lg:overflow-visible lg:rounded-none"
    >
      <div className={cn("grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 lg:items-center", COLUMNS)}>
        <NftImage
          artwork={line.artwork}
          alt=""
          size={100}
          className={cn(
            "row-span-2 size-[100px] lg:row-span-1 lg:size-[70px] lg:rounded-md",
            unavailable && "opacity-45 grayscale",
          )}
        />

        <div className="flex min-w-0 flex-col gap-1 pt-3 pr-3 lg:p-0">
          <h2 className="truncate text-base leading-5 font-bold">
            <Link to="/nft/$nftId" params={{ nftId: line.nftId }} className="hover:text-highlight">
              {line.name}
            </Link>
          </h2>
          <p className="text-sm leading-5 text-subtle">
            <span className="hidden lg:inline">ID do token: #{line.tokenId} · </span>
            Edição: {line.editionLabel}
          </p>
        </div>

        <p className="hidden text-base leading-5 font-bold text-sand lg:block">
          <span className="sr-only">Preço unitário: </span>
          {formatEthLabel(line.unitPrice)}
        </p>

        {/* mobile: total à esquerda e controles à direita; desktop: cada um na sua coluna */}
        <div className="flex items-center justify-between gap-2 pr-3 pb-3 lg:contents">
          <p
            data-testid="line-total"
            className="order-1 text-lg leading-5 font-bold text-highlight lg:order-2 lg:text-base"
          >
            <span className="sr-only">Total: </span>
            <FlashOnChange value={line.lineTotal}>{formatEthLabel(line.lineTotal)}</FlashOnChange>
          </p>
          <QuantityStepper
            value={line.quantity}
            max={Math.max(line.maxQuantity, 1)}
            onChange={setQuantity}
            itemName={line.name}
            disabled={unavailable}
            className="order-2 ml-auto lg:order-1 lg:ml-0"
          />
          <button
            type="button"
            onClick={removeLine}
            aria-label={`Remover ${line.name} do carrinho`}
            className="order-3 flex size-6 items-center justify-center text-primary transition-colors hover:text-highlight"
          >
            <Icon src={trashIcon} className="size-6" />
          </button>
        </div>
      </div>

      {line.status !== "ok" && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-coral/40 px-3 py-2 text-xs leading-4 text-coral">
          <span>
            <span className="font-bold">Indisponível: </span>
            {unavailable
              ? `a edição ${line.editionLabel} esgotou.`
              : line.maxQuantity === 1
                ? "só há 1 unidade disponível desta edição."
                : `só há ${line.maxQuantity} unidades disponíveis desta edição.`}
          </span>
          <button
            type="button"
            onClick={unavailable ? removeLine : () => setQuantity(line.maxQuantity)}
            className="font-bold text-highlight underline underline-offset-2"
          >
            {unavailable ? "Remover item" : `Ajustar para ${line.maxQuantity}`}
          </button>
        </p>
      )}
    </li>
  );
}

type CouponValues = z.input<typeof couponSchema>;

// campo do código promocional
function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();
  const form = useForm<CouponValues, unknown, z.output<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: "" },
  });
  const error = form.formState.errors.code?.message;

  if (cart.couponCode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-4 font-bold">Código promocional</p>
        <p className="flex items-center justify-between gap-3 text-sm leading-5 text-sand">
          <span>
            Cupom <strong className="text-foreground">{cart.couponCode}</strong> aplicado.
          </span>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => form.reset({ code: "" }),
                onError: (apiError) => toast.error(apiError.message),
              })
            }
            className="font-bold text-highlight underline underline-offset-2 disabled:opacity-50"
          >
            Remover cupom
          </button>
        </p>
      </div>
    );
  }

  const submit = form.handleSubmit(({ code }) =>
    apply.mutate(code, {
      onSuccess: () => toast.success(`Cupom ${code} aplicado.`),
      // cupom inválido ou expirado: a mensagem da API vai para o campo
      onError: (apiError) =>
        form.setError("code", { type: "server", message: apiError.fields.code ?? apiError.message }),
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor="cupom" className="text-sm leading-4 font-bold">
        Código promocional
      </label>
      <div className="flex h-[50px] overflow-hidden rounded-full border border-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring lg:h-10 lg:rounded-sm">
        <input
          id="cupom"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cupom-erro" : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm uppercase outline-none placeholder:text-xs placeholder:text-subtle placeholder:normal-case lg:px-2"
          {...form.register("code")}
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="w-[102px] shrink-0 rounded-full bg-primary text-sm font-bold text-ink transition-colors hover:bg-highlight disabled:opacity-50 lg:rounded-none"
        >
          {apply.isPending ? "Aplicando…" : "Aplicar"}
        </button>
      </div>
      {error && (
        <p id="cupom-erro" role="alert" className="text-xs leading-4 text-coral">
          <span className="sr-only">Erro: </span>
          {error}
        </p>
      )}
    </form>
  );
}

// carrossel "Colecionadores também viram"
function Suggestions({ cart }: { cart: Cart }) {
  const { data } = useNftList({ tab: "em-alta", pageSize: 12 });
  const inCart = new Set(cart.lines.map((line) => line.nftId));
  const nfts = (data?.items ?? []).filter((nft) => !inCart.has(nft.id)).slice(0, 10);
  return <RelatedCarousel title="Colecionadores também viram" nfts={nfts} />;
}

// carrinho vazio
function EmptyCart() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
      <p className="max-w-xl text-sm leading-6 text-sand">
        Explore o mercado e adicione os NFTs que quiser colecionar.
      </p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar o mercado
        </Link>
      </Button>
    </div>
  );
}

// página do carrinho
export function CartPage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const cart = useCart();
  const hasLines = (cart.data?.lines.length ?? 0) > 0;
  // no carrinho a taxa é estimada para a rede padrão; a rede é escolhida no pagamento
  const quote = useQuote("ethereum", hasLines);
  const mutating = useIsCartMutating();

  const updating = mutating || quote.isFetching;
  const blocked = quote.data !== undefined && !quote.data.purchasable;

  const header = isDesktop ? (
    <Breadcrumb current="Carrinho" />
  ) : (
    <MobilePageHeader title="Carrinho de NFTs" backTo="/" backLabel="Voltar ao início" />
  );

  if (cart.isPending) {
    return (
      <div className="container-page flex flex-col gap-6 pt-8 pb-24">
        {header}
        <div role="status" aria-label="Carregando carrinho" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[100px] lg:h-[70px]" />
          ))}
        </div>
      </div>
    );
  }

  if (cart.isError) {
    return (
      <div className="container-page flex flex-col gap-6 pt-8 pb-24">
        {header}
        <div role="alert" className="flex flex-col items-start gap-4">
          <h2 className="text-lg font-bold">Não foi possível carregar o carrinho</h2>
          <p className="text-sm leading-6 text-sand">{cart.error.message}</p>
          <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  if (!hasLines) {
    return (
      <div className="container-page flex flex-col gap-6 pt-8 pb-24">
        {header}
        <EmptyCart />
      </div>
    );
  }

  const checkoutButton = (
    <Button
      variant={isDesktop ? "default" : "pill"}
      size={isDesktop ? "default" : "xl"}
      disabled={blocked || updating || !quote.data}
      aria-describedby={blocked ? "carrinho-bloqueado" : undefined}
      // visitantes passam pelo login (guarda da rota) e voltam direto ao pagamento
      onClick={() => void navigate({ to: "/pagamento" })}
      className="w-full lg:rounded-sm"
    >
      Conectar e finalizar
    </Button>
  );

  return (
    <div className="flex flex-col gap-16 pt-8 pb-[150px] lg:gap-24 lg:pb-24">
      <div className="container-page flex flex-col gap-6 lg:gap-3">
        {header}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-[86px]">
          <section aria-label="Itens do carrinho" className="flex min-w-0 flex-1 flex-col gap-3">
            <div
              aria-hidden="true"
              className={cn("hidden border-b border-primary/50 pb-2.5 text-base font-medium lg:grid", COLUMNS)}
            >
              <span className="col-span-2">NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            <ul className="flex flex-col gap-5 lg:gap-3">
              {cart.data.lines.map((line) => (
                <CartLineRow key={line.id} line={line} />
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="resumo-titulo"
            className="flex flex-col gap-6 max-lg:-mx-4 max-lg:rounded-t-[31px] max-lg:bg-surface max-lg:px-6 max-lg:py-8 md:max-lg:-mx-6 lg:w-[332px] lg:shrink-0"
          >
            <div className="flex flex-col gap-3 max-lg:sr-only">
              <h2 id="resumo-titulo" className="text-lg leading-6 font-bold">
                Resumo da carteira
              </h2>
              <div className="hairline" />
            </div>

            <CouponForm cart={cart.data} />
            <QuoteSummary
              quote={quote.data}
              error={quote.error}
              onRetry={() => void quote.refetch()}
              updating={updating}
            />

            {blocked && (
              <p id="carrinho-bloqueado" role="status" className="text-sm leading-5 text-coral">
                Há itens indisponíveis. Ajuste ou remova-os para continuar.
              </p>
            )}

            {isDesktop && (
              <div className="flex flex-col items-center gap-4">
                {checkoutButton}
                <Link to="/" hash="catalogo" className="text-[15px] text-highlight hover:underline">
                  Continuar explorando
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="container-page">
        <Suggestions cart={cart.data} />
      </div>

      {!isDesktop && (
        <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[40px] bg-surface px-6 pt-5 pb-8 shadow-glow">
          {checkoutButton}
        </div>
      )}
    </div>
  );
}
