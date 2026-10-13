import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Tabs } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import type { NftDetail } from "@/api/contracts";
import { NETWORK_LABELS } from "@/api/contracts";
import chevronLeftIcon from "@/assets/icons/chevron-left.svg";
import linkedinIcon from "@/assets/icons/linkedin.svg";
import messageIcon from "@/assets/icons/message.svg";
import shopIcon from "@/assets/icons/shop.svg";
import starIcon from "@/assets/icons/star.svg";
import twitterIcon from "@/assets/icons/twitter.svg";
import { Icon } from "@/components/icon";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/features/cart/use-cart";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { Gallery } from "@/features/nft/gallery";
import { RelatedCarousel } from "@/features/nft/related-carousel";
import { formatEthLabel } from "@/lib/eth";
import { useIsDesktop } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { FlashOnChange } from "@/components/flash-on-change";

// nota em estrelas
function Rating({ rating, compact = false }: { rating: NftDetail["rating"]; compact?: boolean }) {
  const average = rating.average.toFixed(1).replace(".", ",");
  const label = `Nota ${average} de 5, ${rating.count} avaliações de colecionadores`;

  if (compact) {
    return (
      <p
        aria-label={label}
        className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-sm leading-4"
      >
        <Icon src={starIcon} className="size-3 text-amber" />
        <span aria-hidden="true" className="font-medium">
          {average}
        </span>
        <span aria-hidden="true" className="text-sand">
          ({rating.count})
        </span>
      </p>
    );
  }

  const filled = Math.round(rating.average);
  return (
    <p className="flex items-center gap-1 text-[15px]">
      <span role="img" aria-label={`Nota ${average} de 5`} className="flex gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Icon
            key={index}
            src={starIcon}
            className={cn("size-[13px]", index < filled ? "text-primary" : "text-sand/50")}
          />
        ))}
      </span>
      {rating.count} avaliações de colecionadores
    </p>
  );
}

// tela de detalhes do NFT (desktop e mobile)
export function NftDetailView({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate();
  const router = useRouter();
  const addToCart = useAddToCart();
  // desktop e mobile têm estruturas diferentes; só uma é montada (sem conteúdo duplicado no DOM)
  const isDesktop = useIsDesktop();

  const [editionId, setEditionId] = useState(nft.defaultEditionId);
  const [quantity, setQuantity] = useState(1);

  const edition = nft.editions.find((item) => item.id === editionId);
  const maxQuantity = edition ? Math.min(edition.available, edition.maxPerOrder) : 0;
  // a disponibilidade pode cair por evento em tempo real: a quantidade nunca passa do limite atual
  const safeQuantity = Math.max(1, Math.min(quantity, Math.max(maxQuantity, 1)));
  const canBuy = maxQuantity > 0;

  function selectEdition(id: string) {
    setEditionId(id);
    setQuantity(1);
  }

  function add(goToCart: boolean) {
    if (!edition || !canBuy) return;
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: safeQuantity },
      {
        onSuccess: () => {
          if (goToCart) void navigate({ to: "/carrinho" });
          else toast.success(`${nft.name} adicionado ao carrinho.`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  const availabilityText = !edition
    ? "Todas as edições estão esgotadas."
    : !canBuy
      ? `A edição ${edition.label} está esgotada. Escolha outra edição.`
      : edition.id === "open"
        ? `Edição aberta · até ${maxQuantity} por pedido`
        : `${edition.available} ${edition.available === 1 ? "unidade disponível" : "unidades disponíveis"} · até ${maxQuantity} por pedido`;

  const shareUrl = typeof window === "undefined" ? "" : window.location.href;
  const shareText = `${nft.name} na Kurio`;

  const editionPicker = (
    <fieldset className="flex flex-col gap-2 lg:gap-3">
      <legend className="mb-2 text-[15px] leading-4 font-bold lg:mb-3">Edição:</legend>
      <div className="flex flex-wrap gap-3 lg:gap-1.5">
        {nft.editions.map((item) => {
          const soldOut = item.available === 0;
          const selected = item.id === editionId;
          return (
            <label
              key={item.id}
              className={cn(
                "relative flex h-7 cursor-pointer items-center justify-center rounded-full border px-2 text-sm leading-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                selected ? "border-primary font-medium text-highlight" : "border-border text-sand hover:border-border-soft",
                soldOut && "border-dashed opacity-60",
              )}
            >
              <input
                type="radio"
                name="edicao"
                value={item.id}
                checked={selected}
                onChange={() => selectEdition(item.id)}
                aria-label={soldOut ? `${item.label} (esgotada)` : item.label}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <span className={cn(soldOut && "line-through")}>{item.label}</span>
            </label>
          );
        })}
      </div>
      <p className={cn("text-xs leading-4", canBuy ? "text-sand" : "text-coral")} aria-live="polite">
        {availabilityText}
      </p>
    </fieldset>
  );

  const tokenInfo = (
    <dl className="flex flex-col gap-3 text-[15px] text-subtle">
      <div className="flex gap-2">
        <dt>ID do token:</dt>
        <dd>#{nft.tokenId}</dd>
      </div>
      <div className="flex gap-2">
        <dt>Coleção:</dt>
        <dd>{nft.collection}</dd>
      </div>
      <div className="flex gap-2">
        <dt>Atributos:</dt>
        <dd>{nft.attributes.join(", ")}</dd>
      </div>
    </dl>
  );

  const description = (
      <Tabs.Root defaultValue="detalhes" className="flex flex-col gap-3">
        <Tabs.List aria-label="Informações do NFT" className="flex gap-8 border-b border-primary/50">
          {[
            { value: "detalhes", label: "Detalhes do NFT" },
            { value: "avaliacoes", label: `Avaliações de colecionadores (${nft.rating.count})` },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="-mb-px border-b-[3px] border-transparent pb-3 text-[17px] leading-4 text-foreground transition-colors hover:text-highlight data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-highlight"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="detalhes" className="flex flex-col gap-3 text-sm leading-6 text-sand">
          {nft.description.map((paragraph) => (
            <p key={paragraph} className="mb-3">
              {paragraph}
            </p>
          ))}
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="font-bold text-foreground">Rede:</dt>
              <dd>
                Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados
                armazenados no IPFS.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-foreground">Direitos autorais:</dt>
              <dd>
                Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos
                automaticamente pelos mercados compatíveis.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-foreground">Contrato:</dt>
              <dd>{nft.contract} • Contrato inteligente ERC-721 verificado.</dd>
            </div>
          </dl>
        </Tabs.Content>

        <Tabs.Content value="avaliacoes" className="flex flex-col gap-3 text-sm leading-6 text-sand">
          <Rating rating={nft.rating} />
          <p>
            A nota resume as avaliações de colecionadores que compraram obras de {nft.creator}. A
            leitura das avaliações individuais não faz parte desta entrega.
          </p>
        </Tabs.Content>
      </Tabs.Root>
  );

  const related = <RelatedCarousel title="Mais desta coleção" nfts={nft.related} />;

  if (!isDesktop) {
    return (
      <div>
        <div className="bg-linear-[138deg] from-surface from-12% to-surface-raised px-7 pt-6 pb-[60px]">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: "/" }))}
              aria-label="Voltar"
              className="flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-sand"
            >
              <Icon src={chevronLeftIcon} className="size-3.5 rotate-90" />
            </button>
            <FavoriteButton nft={nft} />
          </div>
          <Gallery artwork={nft.artwork} name={nft.name} />
        </div>

        <div className="-mt-8 flex flex-col gap-3 rounded-t-[31px] bg-surface px-6 pt-8 pb-[190px]">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl leading-6 font-bold">{nft.name}</h1>
            <Rating rating={nft.rating} compact />
          </div>
          <p className="text-sm leading-6 text-sand">{nft.summary}</p>
          {editionPicker}
          {tokenInfo}
          <div className="pt-6">{description}</div>
          <div className="pt-6">{related}</div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-5 rounded-t-[40px] bg-surface px-6 pt-5 pb-9 shadow-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[15px] leading-4 font-medium text-sand">Qtd.</span>
              <QuantityStepper
                value={safeQuantity}
                max={Math.max(maxQuantity, 1)}
                onChange={setQuantity}
                itemName={nft.name}
                disabled={!canBuy}
              />
            </div>
            <p data-testid="nft-price" className="text-xl leading-4 font-bold text-highlight">
              <FlashOnChange value={nft.price}>{formatEthLabel(nft.price)}</FlashOnChange>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="pill"
              size="xl"
              onClick={() => add(true)}
              disabled={!canBuy || addToCart.isPending}
              className="min-w-[196px] flex-1"
            >
              {canBuy ? "Comprar NFT" : "Esgotado"}
            </Button>
            <button
              type="button"
              onClick={() => add(false)}
              disabled={!canBuy || addToCart.isPending}
              aria-label={`Adicionar ${nft.name} ao carrinho`}
              className="flex size-[60px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-subtle disabled:opacity-50"
            >
              <Icon src={shopIcon} className="size-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-24 pt-8 pb-24">
      <div className="container-page flex flex-col gap-3">
        <nav aria-label="Você está em" className="text-[15px] leading-4 font-bold">
          <ol className="flex gap-2">
            <li>
              <Link to="/" className="hover:text-highlight">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-highlight">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>

        <div className="flex items-start gap-8">
          <Gallery artwork={nft.artwork} name={nft.name} />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h1 className="text-[28px] font-bold">{nft.name}</h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p data-testid="nft-price" className="text-[22px] leading-4 font-bold text-highlight">
                <FlashOnChange value={nft.price}>{formatEthLabel(nft.price)}</FlashOnChange>
                {nft.previousPrice && (
                  <span className="ml-3 text-lg font-normal text-subtle">
                    <span className="sr-only">Preço anterior: </span>
                    <s>{formatEthLabel(nft.previousPrice)}</s>
                  </span>
                )}
              </p>
              <Rating rating={nft.rating} />
            </div>
            <div className="hairline" />

            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-sand">{nft.summary}</p>
            </div>

            {editionPicker}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <QuantityStepper
                size="lg"
                value={safeQuantity}
                max={Math.max(maxQuantity, 1)}
                onChange={setQuantity}
                itemName={nft.name}
                disabled={!canBuy}
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => add(true)}
                  disabled={!canBuy || addToCart.isPending}
                  className="w-[130px]"
                >
                  {addToCart.isPending ? "ADICIONANDO…" : "COMPRAR"}
                </Button>
                <FavoriteButton nft={nft} variant="labeled" />
              </div>
            </div>

            {tokenInfo}

            <div className="flex items-center gap-2">
              <p className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</p>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no LinkedIn (abre em nova aba)"
                className="flex size-6 items-center justify-center hover:text-highlight"
              >
                <Icon src={linkedinIcon} className="size-[15px]" />
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`}
                aria-label="Compartilhar por e-mail"
                className="flex size-6 items-center justify-center hover:text-highlight"
              >
                <Icon src={messageIcon} className="size-[18px]" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no X/Twitter (abre em nova aba)"
                className="flex size-6 items-center justify-center hover:text-highlight"
              >
                <Icon src={twitterIcon} className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page">{description}</div>
      <div className="container-page">{related}</div>
    </div>
  );
}
