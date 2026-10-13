import { Link } from "@tanstack/react-router";
import type { NftListResponse } from "@/api/contracts";
import { Button } from "@/components/ui/button";
import { NftCard, NftCardSkeleton } from "@/features/catalog/nft-card";
import type { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";

type CatalogGridProps = {
  data: NftListResponse | undefined;
  error: ApiError | null;
  /** Primeira carga, ainda sem dados para mostrar. */
  isLoading: boolean;
  /** Há dados na tela, mas uma nova página ou filtro está sendo buscado. */
  isRefreshing: boolean;
  filtered: boolean;
  onRetry: () => void;
};

/**
 * Com duas colunas (abaixo de 768px) elas ficam desencontradas, como no layout
 * mobile: os itens pares descem 32px e o contêiner reserva esse espaço.
 */
const gridClass =
  "grid grid-cols-2 gap-x-4 gap-y-6 max-md:pb-8 max-md:[&>*:nth-child(even)]:translate-y-8 md:grid-cols-3 md:gap-y-10 lg:gap-x-[34px] lg:gap-y-[72px]";

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 bg-surface px-6 py-12 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

export function CatalogGrid({ data, error, isLoading, isRefreshing, filtered, onRetry }: CatalogGridProps) {
  if (isLoading) {
    return (
      <div className={gridClass} role="status" aria-label="Carregando NFTs">
        {Array.from({ length: 9 }, (_, index) => (
          <NftCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // com dados em tela, uma falha de atualização não apaga o que já foi carregado
  if (error && !data) {
    return (
      <div role="alert">
        <Message title="Não foi possível carregar o catálogo">
          <p className="max-w-md text-sm leading-6 text-sand">{error.message}</p>
          <Button onClick={onRetry}>Tentar novamente</Button>
        </Message>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Message title="Nenhum NFT encontrado">
        <p className="max-w-md text-sm leading-6 text-sand">
          {filtered
            ? "Nenhum item corresponde à busca e aos filtros selecionados."
            : "O catálogo está vazio no momento. Volte em breve."}
        </p>
        {filtered && (
          <Button asChild variant="outline">
            <Link to="/" hash="catalogo">
              Limpar filtros
            </Link>
          </Button>
        )}
      </Message>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3 text-sm text-sand">
          Não foi possível atualizar a lista: {error.message}
          <Button variant="link" onClick={onRetry} className="text-sm">
            Tentar novamente
          </Button>
        </p>
      )}
      <ul
        aria-busy={isRefreshing}
        className={cn(gridClass, "transition-opacity", isRefreshing && "opacity-60")}
      >
        {data.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} priority={index < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}
