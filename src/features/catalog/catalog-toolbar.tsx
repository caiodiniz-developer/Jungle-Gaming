import { Link } from "@tanstack/react-router";
import type { NftSort, NftTab } from "@/api/contracts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CatalogSearch, SORT_OPTIONS, TAB_OPTIONS } from "@/features/catalog/search";
import { cn } from "@/lib/utils";

type CatalogToolbarProps = {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => void;
};

// abas do catálogo (todos, novos, em alta)
export function CatalogTabs({ search }: Pick<CatalogToolbarProps, "search">) {
  const active: NftTab = search.aba ?? "todos";

  return (
    <nav aria-label="Seções do catálogo">
      <ul className="flex gap-4 overflow-x-auto text-sm leading-4 lg:gap-5 lg:text-[15px] lg:font-medium">
        {TAB_OPTIONS.map((tab) => {
          const isActive = tab.value === active;
          return (
            <li key={tab.value} className="shrink-0">
              <Link
                to="/"
                // trocar de aba mantém os filtros e reinicia a paginação
                search={(previous) => ({
                  ...previous,
                  aba: tab.value === "todos" ? undefined : tab.value,
                  pagina: undefined,
                })}
                hash="catalogo"
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-1 pb-0.5 transition-colors hover:text-highlight",
                  isActive ? "font-bold text-highlight lg:font-medium" : "text-foreground",
                )}
              >
                {tab.label}
                <span aria-hidden="true" data-active={isActive} className="underline-grow h-0.5 w-full bg-primary" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// seletor de ordenação
export function SortSelect({ search, onChange }: CatalogToolbarProps) {
  const value: NftSort = search.ordem ?? "recentes";

  return (
    <div className="flex items-center gap-1 text-[15px]">
      <span id="ordenar-por" className="shrink-0">
        Ordenar por:
      </span>
      <Select
        value={value}
        onValueChange={(next) =>
          onChange({ ordem: next === "recentes" ? undefined : (next as CatalogSearch["ordem"]) })
        }
      >
        <SelectTrigger
          aria-labelledby="ordenar-por"
          className="h-auto gap-2 border-0 bg-transparent px-1 py-0 text-[15px] text-foreground shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
