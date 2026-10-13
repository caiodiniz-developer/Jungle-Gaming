import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { NftSummary } from "@/api/contracts";
import cartIcon from "@/assets/icons/cart.svg";
import searchIcon from "@/assets/icons/search.svg";
import { Icon } from "@/components/icon";
import { NftImage } from "@/components/nft-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddToCart } from "@/features/cart/use-cart";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { formatEthLabel } from "@/lib/eth";
import { cn } from "@/lib/utils";

type NftCardProps = {
  nft: NftSummary;
  /** Primeira linha da grade: imagens carregam sem lazy. */
  priority?: boolean;
  /** Variante menor do carrossel de relacionados. */
  compact?: boolean;
  className?: string;
};

const actionButton =
  "flex size-[35px] items-center justify-center rounded-sm bg-ink text-foreground transition-colors hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50";

export function NftCard({ nft, priority = false, compact = false, className }: NftCardProps) {
  const addToCart = useAddToCart();

  function handleAddToCart() {
    if (!nft.defaultEditionId) return;
    addToCart.mutate(
      { nftId: nft.id, editionId: nft.defaultEditionId, quantity: 1 },
      {
        onSuccess: () => toast.success(`${nft.name} adicionado ao carrinho.`),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <article className={cn("group relative flex flex-col gap-2 lg:gap-3", className)}>
      <div
        className={cn(
          "relative flex aspect-[175/200] items-center justify-center overflow-hidden rounded-[20px] bg-linear-[139.5deg] from-surface from-12% to-surface-raised",
          "lg:rounded-none lg:bg-surface lg:bg-none",
          compact ? "lg:aspect-[219/255]" : "lg:aspect-[258/300]",
        )}
      >
        <NftImage
          artwork={nft.artwork}
          alt=""
          size={compact ? 213 : 250}
          sizes={compact ? "(min-width: 1024px) 213px, 45vw" : "(min-width: 1024px) 250px, 45vw"}
          priority={priority}
          className={cn("w-[96%] rounded-2xl lg:rounded-[15px]", !nft.available && "opacity-45 grayscale")}
        />

        {nft.rare && (
          <span className="absolute top-4 left-0 bg-primary px-2 py-1.5 text-[13px] leading-4 font-medium text-ink lg:top-0 lg:px-3">
            RARO
          </span>
        )}
        {!nft.available && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-ink/85 px-2 py-1 text-xs font-bold text-sand">
            ESGOTADO
          </span>
        )}

        {/* desktop: ações aparecem ao passar o mouse ou ao navegar por teclado */}
        <div
          className={cn(
            "absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 gap-2.5 opacity-0 transition-opacity lg:flex",
              "group-focus-within:opacity-100 group-hover:opacity-100",
            )}
          >
          <button
            type="button"
            className={actionButton}
            onClick={handleAddToCart}
            disabled={!nft.defaultEditionId || addToCart.isPending}
            aria-label={
              nft.defaultEditionId ? `Adicionar ${nft.name} ao carrinho` : `${nft.name} está esgotado`
            }
          >
            <Icon src={cartIcon} className="size-5" />
          </button>
          <FavoriteButton
            nft={nft}
            className="rounded-sm border-0 bg-ink text-foreground hover:text-highlight"
          />
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className={actionButton}
            aria-label={`Ver detalhes de ${nft.name}`}
            tabIndex={-1}
          >
            <Icon src={searchIcon} className="size-5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 pl-2 lg:gap-1.5 lg:pl-0">
        <h3 className={cn("text-[15px] leading-5 font-normal", !compact && "lg:text-base lg:leading-4")}>
          {/* o link cobre o card inteiro; os botões de ação ficam acima dele */}
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-ring lg:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 leading-4">
          <span className={cn("text-base font-bold text-highlight", !compact && "lg:text-lg")}>
            {formatEthLabel(nft.price)}
          </span>
          {nft.previousPrice && (
            <span className={cn("text-sm text-subtle", !compact && "lg:text-lg")}>
              <span className="sr-only">Preço anterior: </span>
              <s>{formatEthLabel(nft.previousPrice)}</s>
            </span>
          )}
        </p>
      </div>

      {/* mobile: só o favorito, no canto da imagem (como no layout) */}
      <FavoriteButton nft={nft} className="absolute top-3 right-2 z-10 size-7 lg:hidden" />

    </article>
  );
}

export function NftCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2 lg:gap-3" aria-hidden="true">
      <Skeleton
        className={cn(
          "aspect-[175/200] rounded-[20px] lg:rounded-none",
          compact ? "lg:aspect-[219/255]" : "lg:aspect-[258/300]",
        )}
      />
      <div className="flex flex-col gap-1.5 pl-2 lg:pl-0">
        <Skeleton className="h-5 w-3/4 lg:h-4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
