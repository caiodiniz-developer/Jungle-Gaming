import type { Artwork } from "@/api/contracts";
import { cn } from "@/lib/utils";

const WIDTHS = [96, 256, 512, 900] as const;

type NftImageProps = {
  artwork: Artwork;
  /** Texto alternativo; string vazia quando o nome já aparece ao lado da imagem. */
  alt: string;
  /** Largura de exibição em px no maior breakpoint: define `sizes` e a imagem padrão. */
  size: number;
  /** Valor de `sizes` quando a largura varia com a tela. */
  sizes?: string;
  /** Imagem acima da dobra (candidata a LCP): carrega sem lazy e com prioridade alta. */
  priority?: boolean;
  className?: string;
};

/**
 * Arte do NFT com `srcset`: o navegador escolhe entre 96, 256, 512 e 900 px
 * conforme o tamanho exibido e a densidade da tela. `width`/`height` fixos
 * reservam o espaço e evitam deslocamento de layout.
 */
export function NftImage({ artwork, alt, size, sizes, priority = false, className }: NftImageProps) {
  const fallback = WIDTHS.find((width) => width >= size) ?? 900;
  return (
    <img
      src={`/nfts/${artwork}-${fallback}.webp`}
      srcSet={WIDTHS.map((width) => `/nfts/${artwork}-${width}.webp ${width}w`).join(", ")}
      sizes={sizes ?? `${size}px`}
      width={size}
      height={size}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={cn("aspect-square bg-surface-raised object-cover", className)}
    />
  );
}
