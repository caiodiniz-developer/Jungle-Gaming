import { z } from "zod";
import type { Network, NftListParams, NftSort, NftTab } from "@/api/contracts";
import { isEthAmount } from "@/lib/eth";

/** O roteador converte "12" em número ao ler a URL; aqui tudo volta a ser texto. */
const text = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .optional()
  .catch(undefined);

/**
 * Estado do catálogo na URL (em português, como o restante das rotas).
 * Valores inválidos são descartados em vez de quebrar a página, então um link
 * editado à mão ou antigo ainda abre o catálogo.
 */
export const catalogSearchSchema = z.object({
  q: text,
  colecoes: text,
  redes: text,
  min: text,
  max: text,
  aba: z.enum(["novos", "em-alta"]).optional().catch(undefined),
  ordem: z.enum(["preco-asc", "preco-desc", "nome"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(2).optional().catch(undefined),
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

// redes aceitas no filtro
const NETWORKS: Network[] = ["ethereum", "polygon", "solana"];

// "a,b" → ["a", "b"]
export function parseList(value: string | undefined): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

// ["a", "b"] → "a,b"
export function formatList(values: string[]): string | undefined {
  return values.length > 0 ? [...values].sort().join(",") : undefined;
}

// opções de ordenação
export const SORT_OPTIONS: { value: NftSort; label: string }[] = [
  { value: "recentes", label: "Listados recentemente" },
  { value: "preco-asc", label: "Menor preço" },
  { value: "preco-desc", label: "Maior preço" },
  { value: "nome", label: "Nome (A–Z)" },
];

// abas do catálogo
export const TAB_OPTIONS: { value: NftTab; label: string }[] = [
  { value: "todos", label: "Todos os NFTs" },
  { value: "novos", label: "Novos lançamentos" },
  { value: "em-alta", label: "Em alta" },
];

/** Converte o estado da URL nos parâmetros do contrato REST. */
export function toListParams(search: CatalogSearch): NftListParams {
  const params: NftListParams = { page: search.pagina ?? 1, pageSize: 9 };
  if (search.q) params.q = search.q;
  const categories = parseList(search.colecoes);
  if (categories.length) params.categories = categories;
  const networks = parseList(search.redes).filter((item): item is Network =>
    NETWORKS.includes(item as Network),
  );
  if (networks.length) params.networks = networks;
  if (search.min && isEthAmount(search.min)) params.minPrice = search.min;
  if (search.max && isEthAmount(search.max)) params.maxPrice = search.max;
  if (search.aba) params.tab = search.aba;
  if (search.ordem) params.sort = search.ordem;
  return params;
}

// diz se há busca ou filtro aplicado
export function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(search.q || search.colecoes || search.redes || search.min || search.max || search.aba);
}
