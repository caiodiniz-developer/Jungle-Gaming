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
 * O arquivo de design usa a mesma arte nas quatro miniaturas. Para que a
 * galeria tenha função, cada miniatura mostra um enquadramento diferente da obra.
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

export function Gallery({ artwork, name }: GalleryProps) {
  const [active, setActive] = useState(0);
  const view = VIEWS[active] ?? VIEWS[0];

  return (
    <div className="flex w-full shrink-0 flex-col-reverse items-center gap-4 lg:w-[573px] lg:flex-row lg:items-start lg:gap-7">
      <ul aria-label="Enquadramentos da obra" className="flex gap-3 lg:w-[100px] lg:flex-col lg:gap-4">
        {VIEWS.map((item, index) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Mostrar ${item.label.toLowerCase()}`}
              aria-pressed={index === active}
              className={cn(
                "block size-[64px] overflow-hidden rounded-lg border bg-surface transition-[border-color,opacity] duration-300 lg:size-[100px]",
                index === active ? "border-primary" : "border-transparent opacity-75 hover:border-border-soft hover:opacity-100",
              )}
            >
              <span className="block size-full" style={item.style}>
                <NftImage artwork={artwork} alt="" size={100} className="size-full" />
              </span>
              <span className="sr-only">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="relative flex aspect-square w-full max-w-[444px] items-center justify-center rounded-md bg-surface p-4">
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

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`Ampliar imagem de ${name}`}
              className="absolute top-[15px] right-[15px] rounded-full transition-opacity hover:opacity-80"
            >
              <img src={zoomButton} alt="" width={30} height={30} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[min(92vw,720px)] border-border bg-surface p-4 sm:max-w-[min(92vw,720px)]">
            <DialogTitle className="pr-8 text-base font-bold">{name}</DialogTitle>
            <DialogDescription className="sr-only">Imagem ampliada da obra.</DialogDescription>
            <NftImage artwork={artwork} alt={name} size={900} sizes="(min-width: 768px) 690px, 88vw" className="w-full rounded-2xl" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
