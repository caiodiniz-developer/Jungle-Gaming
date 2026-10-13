import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import filterIcon from "@/assets/icons/filter.svg";
import searchIcon from "@/assets/icons/search-mobile.svg";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CatalogGrid } from "@/features/catalog/catalog-grid";
import { CatalogTabs, SortSelect } from "@/features/catalog/catalog-toolbar";
import { Filters } from "@/features/catalog/filters";
import { Blog, FeaturedBanner, Hero, Promos } from "@/features/catalog/home-sections";
import { Pagination } from "@/features/catalog/pagination";
import {
  type CatalogSearch,
  catalogSearchSchema,
  hasActiveFilters,
  toListParams,
} from "@/features/catalog/search";
import { nftListOptions, useNftList } from "@/features/catalog/use-nfts";
import { useDebouncedValue } from "@/lib/use-debounced-value";

// rota /
export const Route = createFileRoute("/")({
  // busca, filtros, ordenação e página vivem na URL: sobrevivem a refresh e ao histórico
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  // inicia a consulta junto com a navegação (e no hover do link), sem bloquear a tela
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListOptions(toListParams(deps.search)));
  },
  component: HomePage,
});

// busca do topo no mobile
function MobileSearch({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 350);

  // digitar atualiza a URL após uma pausa, sem criar uma entrada de histórico por tecla
  useEffect(() => {
    if (debounced !== value) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só ao texto estabilizado
  }, [debounced]);

  return (
    <form
      role="search"
      className="flex h-[45px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-surface px-3 focus-within:outline-2 focus-within:outline-ring"
      onSubmit={(event) => {
        event.preventDefault();
        onCommit(text);
      }}
    >
      <Icon src={searchIcon} className="size-[22px] text-subtle" />
      <label htmlFor="busca-mobile" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="busca-mobile"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Explorar coleções"
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-subtle"
      />
    </form>
  );
}

// página inicial: hero, catálogo, promoções e blog
function HomePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const params = toListParams(search);
  const query = useNftList(params);
  const { data } = query;

  /** Qualquer mudança de busca, filtro ou ordenação volta para a primeira página. */
  function updateSearch(patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) {
    void navigate({
      search: (previous) => ({ ...previous, ...patch, pagina: undefined }),
      replace: options.replace,
      resetScroll: false,
    });
  }

  const total = data?.total ?? 0;
  const filtered = hasActiveFilters(search);

  return (
    <div className="flex flex-col gap-4 pt-10 pb-10 lg:gap-24 lg:pt-8 lg:pb-24">
      {/* mobile: busca e botão de filtros no topo, como no layout */}
      <div className="container-page flex items-center gap-2 lg:hidden">
        <MobileSearch
          value={search.q ?? ""}
          onCommit={(value) => updateSearch({ q: value.trim() || undefined }, { replace: true })}
        />
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir filtros"
              className="flex size-[45px] shrink-0 items-center justify-center rounded-[14px] bg-linear-[137deg] from-primary/45 from-25% to-primary text-ink"
            >
              <Icon src={filterIcon} className="size-[18px]" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(340px,100vw)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-8 px-4">
              <SortSelect search={search} onChange={updateSearch} />
              <Filters search={search} facets={data?.facets} onChange={updateSearch} />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button>
                  Ver {total} {total === 1 ? "resultado" : "resultados"}
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Hero />

      <section
        id="catalogo"
        aria-labelledby="catalogo-titulo"
        className="container-page flex scroll-mt-6 items-start gap-12"
      >
        <h2 id="catalogo-titulo" className="sr-only">
          Catálogo de NFTs
        </h2>

        <div className="hidden w-[310px] shrink-0 flex-col gap-6 xl:flex">
          <Filters
            search={search}
            facets={data?.facets}
            onChange={updateSearch}
            className="bg-surface p-5"
          />
          <FeaturedBanner />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <CatalogTabs search={search} />
            <div className="hidden items-center gap-4 lg:flex">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="xl:hidden">
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[360px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
                  </SheetHeader>
                  <Filters
                    search={search}
                    facets={data?.facets}
                    onChange={updateSearch}
                    className="px-4 pb-6"
                  />
                </SheetContent>
              </Sheet>
              <SortSelect search={search} onChange={updateSearch} />
            </div>
          </div>

          {/* anuncia o resultado da busca para leitores de tela */}
          <p className="sr-only" role="status">
            {query.isPending
              ? "Carregando NFTs."
              : query.isPlaceholderData
                ? "Atualizando resultados."
                : `${total} ${total === 1 ? "NFT encontrado" : "NFTs encontrados"}.`}
          </p>

          <CatalogGrid
            data={data}
            error={query.error}
            isLoading={query.isPending}
            isRefreshing={query.isFetching && query.isPlaceholderData}
            filtered={filtered}
            onRetry={() => void query.refetch()}
          />

          {data && <Pagination page={data.page} totalPages={data.totalPages} />}
        </div>
      </section>

      <Promos />
      <Blog />
    </div>
  );
}
