import { Link } from "@tanstack/react-router";
import chevronRightIcon from "@/assets/icons/chevron-right.svg";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
};

/** Páginas exibidas: primeira, última e vizinhas da atual, com reticências entre os blocos. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((value) => pages.add(value));

  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) result.push("gap");
    result.push(value);
  }
  return result;
}

const box =
  "flex size-[35px] items-center justify-center rounded-[4px] border border-border text-lg leading-4 transition-colors";

/**
 * Cada página é um link que altera só o parâmetro `pagina` da URL, então a
 * paginação funciona com o histórico do navegador e pode ser aberta em nova aba.
 */
export function Pagination({ page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageSearch = (target: number) => (previous: Record<string, unknown>) => ({
    ...previous,
    pagina: target > 1 ? target : undefined,
  });

  return (
    <nav aria-label="Paginação do catálogo" className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
      {page > 1 && (
        <Link
          to="/"
          search={pageSearch(page - 1)}
          hash="catalogo"
          aria-label="Página anterior"
          className={cn(box, "text-foreground hover:border-primary")}
        >
          <Icon src={chevronRightIcon} className="size-3 rotate-90" />
        </Link>
      )}

      {pageWindow(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-sand">
            …
          </span>
        ) : (
          <Link
            key={item}
            to="/"
            search={pageSearch(item)}
            hash="catalogo"
            aria-label={`Página ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              box,
              item === page
                ? "border-primary bg-primary font-bold text-ink"
                : "text-foreground hover:border-primary",
            )}
          >
            {item}
          </Link>
        ),
      )}

      {page < totalPages && (
        <Link
          to="/"
          search={pageSearch(page + 1)}
          hash="catalogo"
          aria-label="Próxima página"
          className={cn(box, "text-foreground hover:border-primary")}
        >
          <Icon src={chevronRightIcon} className="size-3 -rotate-90" />
        </Link>
      )}
    </nav>
  );
}
