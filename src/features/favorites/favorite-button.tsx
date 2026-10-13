import heartFilledIcon from "@/assets/icons/heart-filled.svg";
import heartIcon from "@/assets/icons/heart.svg";
import { Icon } from "@/components/icon";
import { useFavorites, useToggleFavorite } from "@/features/favorites/use-favorites";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  nft: { id: string; name: string };
  /** "icon": botão redondo sobre a imagem; "labeled": botão com texto do detalhe. */
  variant?: "icon" | "labeled";
  className?: string;
};

/**
 * O estado é comunicado por `aria-pressed`, pela troca do ícone (contorno →
 * preenchido) e pelo texto, não apenas pela cor.
 */
export function FavoriteButton({ nft, variant = "icon", className }: FavoriteButtonProps) {
  const { data } = useFavorites();
  const { toggle } = useToggleFavorite();
  const isFavorite = data?.nftIds.includes(nft.id) ?? false;
  const label = isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`;

  if (variant === "labeled") {
    return (
      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={label}
        onClick={() => toggle(nft, !isFavorite)}
        className={cn(
          "flex h-10 w-[130px] items-center justify-center gap-2 rounded-md border border-primary text-sm leading-5 font-medium text-highlight transition-colors hover:bg-primary/10",
          isFavorite && "bg-primary/15",
          className,
        )}
      >
        <Icon src={isFavorite ? heartFilledIcon : heartIcon} className="size-5" />
        {isFavorite ? "Favorito" : "Favoritar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={label}
      onClick={() => toggle(nft, !isFavorite)}
      className={cn(
        "flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-highlight transition-colors hover:border-primary",
        className,
      )}
    >
      <Icon src={isFavorite ? heartFilledIcon : heartIcon} className="size-4" />
    </button>
  );
}
