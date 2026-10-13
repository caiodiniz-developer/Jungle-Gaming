import { useState } from "react";
import type { Artwork } from "@/api/contracts";
import zoomButton from "@/assets/icons/zoom-button.svg";
import { NftImage } from "@/components/nft-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * O arquivo de design usa a mesma arte nas quatro miniaturas, e é assim que
 * elas aparecem aqui. Para que a galeria tenha função, cada miniatura leva a
 * imagem principal a um enquadramento diferente da obra.
 */
const VIEWS = [
  { label: "Obra completa", style: {} },
  { label: "Rosto", style: { transform: "scale(1.7)", transformOrigin: "50% 32%" } },
  { label: "Detalhe do traje", style: { transform: "scale(1.9)", transformOrigin: "50% 92%" } },
  { label: "Textura do fundo", style: { transform: "scale(2.2)", transformOrigin: "8% 12%" } },
] as const;

type GalleryProps = {
  artwork: Artwork;
  name: string;
};

/**
 * Galeria do NFT. Desktop: miniaturas à esquerda, imagem em cartão e botão de
 * zoom, como no layout. Mobile: só a imagem grande (o layout não tem
 * miniaturas nem botão), e tocar nela abre a versão ampliada.
 */
export function Gallery({ artwork, name }: GalleryProps) {
  const [active, setActive] = useState(0);
  const view = VIEWS[active] ?? VIEWS[0];
  const zoomLabel = `Ampliar imagem de ${name}`;

  return (
    <div className="flex w-full shrink-0 items-start gap-7 lg:w-[573px]">
      <ul aria-label="Enquadramentos da obra" className="hidden w-[100px] flex-col gap-4 lg:flex">
        {VIEWS.map((item, index) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Mostrar ${item.label.toLowerCase()}`}
              aria-pressed={index === active}
              className={cn(
                "block size-[100px] overflow-hidden rounded-lg border bg-surface transition-[border-color] duration-300",
                index === active ? "border-primary" : "border-transparent hover:border-border-soft",
              )}
            >
              <NftImage artwork={artwork} alt="" size={100} className="size-full" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog>
        <div className="relative mx-auto aspect-square w-full max-w-[444px] lg:rounded-md lg:bg-surface lg:p-4">
          <div className="size-full overflow-hidden rounded-3xl">
            <div className="size-full transition-transform duration-500 ease-kurio" style={view.style}>
              <NftImage
                artwork={artwork}
                alt={`${name} — ${view.label.toLowerCase()}`}
                size={404}
                sizes="(min-width: 1024px) 404px, 92vw"
                priority
                className="size-full"
              />
            </div>
          </div>

          {/* mobile: a própria imagem amplia; desktop: o botão do layout */}
          <DialogTrigger asChild>
            <button type="button" aria-label={zoomLabel} className="absolute inset-0 rounded-3xl lg:hidden" />
          </DialogTrigger>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={zoomLabel}
              className="absolute top-[15px] right-[15px] hidden rounded-full transition-opacity hover:opacity-80 lg:block"
            >
              <img src={zoomButton} alt="" width={30} height={30} />
            </button>
          </DialogTrigger>
        </div>

        <DialogContent className="max-w-[min(92vw,720px)] border-border bg-surface p-4 sm:max-w-[min(92vw,720px)]">
          <DialogTitle className="pr-8 text-base font-bold">{name}</DialogTitle>
          <DialogDescription className="sr-only">Imagem ampliada da obra.</DialogDescription>
          <NftImage
            artwork={artwork}
            alt={name}
            size={900}
            sizes="(min-width: 768px) 690px, 88vw"
            className="w-full rounded-2xl"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
