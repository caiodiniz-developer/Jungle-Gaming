import { CheckIcon } from "lucide-react";
import { useId, useState } from "react";
import type { Facet, NftListResponse } from "@/api/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { type CatalogSearch, formatList, parseList } from "@/features/catalog/search";
import { cn } from "@/lib/utils";

type FiltersProps = {
  search: CatalogSearch;
  facets: NftListResponse["facets"] | undefined;
  /** Aplica a mudança na URL; quem chama reinicia a paginação. */
  onChange: (patch: Partial<CatalogSearch>) => void;
  className?: string;
};

/** O slider trabalha em centésimos de ETH (inteiros); a URL recebe a string decimal. */
const toCents = (value: string) => Math.round(Number(value) * 100);
// centésimos → string decimal
const fromCents = (cents: number) => (cents / 100).toFixed(2);
// centésimos → texto com vírgula
const display = (cents: number) => fromCents(cents).replace(".", ",");

// grupo de filtros com caixas de seleção
function FacetGroup({
  title,
  facets,
  selected,
  onToggle,
}: {
  title: string;
  facets: Facet[] | undefined;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg leading-4 font-bold">
        {title}
      </h2>
      {facets ? (
        <ul className="px-3">
          {facets.map((facet) => {
            const checked = selected.includes(facet.id);
            return (
              <li key={facet.id}>
                <label
                  className={cn(
                    "relative flex cursor-pointer items-center justify-between text-[15px] leading-10 transition-colors hover:text-highlight",
                    checked ? "text-highlight" : "text-sand",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      // invisível, mas ocupa a linha inteira: o clique e o foco caem no próprio campo
                      className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                      checked={checked}
                      onChange={() => onToggle(facet.id)}
                    />
                    {/* a marca de seleção indica o estado sem depender só da cor */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[3px] border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                        checked ? "border-primary bg-primary text-ink" : "border-border-soft",
                      )}
                    >
                      {checked && <CheckIcon className="size-3" strokeWidth={3} />}
                    </span>
                    {facet.name}
                  </span>
                  <span className="font-bold tabular-nums">({facet.count})</span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-3 px-3 py-2" aria-hidden="true">
          {Array.from({ length: title === "Rede" ? 3 : 9 }, (_, index) => (
            <Skeleton key={index} className="h-[18px] w-full" />
          ))}
        </div>
      )}
    </section>
  );
}

// filtro de faixa de preço
function PriceFilter({ search, facets, onChange }: Omit<FiltersProps, "className">) {
  const headingId = useId();
  const floor = facets ? toCents(facets.priceRange.min) : 0;
  const ceiling = facets ? toCents(facets.priceRange.max) : 0;
  const appliedMin = search.min ? toCents(search.min) : floor;
  const appliedMax = search.max ? toCents(search.max) : ceiling;

  const [range, setRange] = useState<[number, number]>([appliedMin, appliedMax]);


  function apply() {
    onChange({
      min: range[0] > floor ? fromCents(range[0]) : undefined,
      max: range[1] < ceiling ? fromCents(range[1]) : undefined,
    });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg leading-4 font-bold">
        Faixa de preço
      </h2>
      <div className="flex flex-col items-start gap-3 pl-3">
        {facets ? (
          <Slider
            min={floor}
            max={ceiling}
            step={1}
            minStepsBetweenThumbs={1}
            value={range}
            onValueChange={(value) => setRange([value[0] ?? floor, value[1] ?? ceiling])}
            thumbLabels={["Preço mínimo", "Preço máximo"]}
          />
        ) : (
          <Skeleton className="h-[21px] w-full" aria-hidden="true" />
        )}
        <p className="text-[15px]" aria-live="polite">
          Preço: {display(range[0])} - {display(range[1])} ETH
        </p>
        <Button onClick={apply} disabled={!facets} className="h-9 px-3 text-base">
          Aplicar
        </Button>
      </div>
    </section>
  );
}

/** Painel de filtros do catálogo: coleções e redes combináveis, mais a faixa de preço. */
export function Filters({ search, facets, onChange, className }: FiltersProps) {
  const categories = parseList(search.colecoes);
  const networks = parseList(search.redes);

  const toggle = (current: string[], id: string) =>
    formatList(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <FacetGroup
        title="Coleções"
        facets={facets?.categories}
        selected={categories}
        onToggle={(id) => onChange({ colecoes: toggle(categories, id) })}
      />
      {/* a URL é a fonte da verdade: a chave recria o slider quando o filtro aplicado muda
          (voltar no histórico, limpar filtros) */}
      <PriceFilter
        key={`${search.min ?? ""}:${search.max ?? ""}:${facets?.priceRange.min ?? ""}:${facets?.priceRange.max ?? ""}`}
        search={search}
        facets={facets}
        onChange={onChange}
      />
      <FacetGroup
        title="Rede"
        facets={facets?.networks}
        selected={networks}
        onToggle={(id) => onChange({ redes: toggle(networks, id) })}
      />
    </div>
  );
}
