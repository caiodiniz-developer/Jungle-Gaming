import { useEffect, useRef, useState } from "react";
import type { NftSummary } from "@/api/contracts";
import { NftCard } from "@/features/catalog/nft-card";
import { cn } from "@/lib/utils";

type RelatedCarouselProps = {
  title: string;
  nfts: NftSummary[];
};

/**
 * Carrossel por rolagem horizontal com encaixe (scroll-snap): funciona com
 * toque, trackpad e teclado sem JavaScript; os pontos só indicam e levam à página.
 */
export function RelatedCarousel({ title, nfts }: RelatedCarouselProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  function sync() {
    const element = scroller.current;
    if (!element) return;
    setPages(Math.max(1, Math.ceil(element.scrollWidth / element.clientWidth - 0.05)));
    setPage(Math.round(element.scrollLeft / element.clientWidth));
  }

  // recalcula as páginas quando a largura muda (rotação, redimensionamento)
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [nfts.length]);

  function goTo(index: number) {
    const element = scroller.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (nfts.length === 0) return null;

  return (
    <section aria-label={title} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-[17px] leading-4 font-bold text-highlight">{title}</h2>
        <div className="hairline" />
      </div>

      <ul
        ref={scroller}
        onScroll={sync}
        tabIndex={0}
        aria-label={`${title}: use as setas para rolar`}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] lg:gap-[26px] [&::-webkit-scrollbar]:hidden"
      >
        {nfts.map((nft) => (
          <li key={nft.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[219px]">
            <NftCard nft={nft} compact />
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div role="group" aria-label="Páginas do carrossel" className="flex items-center justify-center gap-1">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir para a página ${index + 1} do carrossel`}
              aria-pressed={index === page}
              className="flex size-6 items-center justify-center"
            >
              <span
                className={cn(
                  "size-3 rounded-full border border-primary transition-colors",
                  index === page && "bg-primary",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
