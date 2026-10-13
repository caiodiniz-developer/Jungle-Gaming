import type {
  Facet,
  Network,
  NftDetail,
  NftListParams,
  NftListResponse,
  NftSummary,
} from "@/api/contracts";
import { NETWORK_LABELS } from "@/api/contracts";
import { compareEth, isEthAmount } from "@/lib/eth";
import { getConfig } from "@/mocks/config";
import { db } from "@/mocks/db";
import { CATEGORIES } from "@/mocks/fixtures/nfts";
import type { DbNft } from "@/mocks/types";

export const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 48;

export function isNftAvailable(nft: DbNft): boolean {
  return nft.editions.some((edition) => edition.available > 0);
}

/** Edição padrão: a 1/50 se houver unidades; senão, a primeira disponível. */
function defaultEdition(nft: DbNft) {
  const available = nft.editions.filter((edition) => edition.available > 0);
  return available.find((edition) => edition.id === "1-50") ?? available[0];
}

export function toNftSummary(nft: DbNft): NftSummary {
  return {
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    artwork: nft.artwork,
    price: nft.price,
    previousPrice: nft.previousPrice,
    category: nft.category,
    network: nft.network,
    rare: nft.rare,
    available: isNftAvailable(nft),
    defaultEditionId: defaultEdition(nft)?.id ?? null,
    listedAt: nft.listedAt,
    version: nft.version,
  };
}

export function toNftDetail(nft: DbNft): NftDetail {
  const related = db()
    .nfts.filter((item) => item.collection === nft.collection && item.id !== nft.id)
    .slice(0, 10)
    .map(toNftSummary);

  return {
    ...toNftSummary(nft),
    collection: nft.collection,
    creator: nft.creator,
    summary: nft.summary,
    description: nft.description,
    attributes: nft.attributes,
    contract: nft.contract,
    royaltyPercent: nft.royaltyPercent,
    rating: nft.rating,
    editions: structuredClone(nft.editions),
    related,
  };
}

export function findNft(nftId: string): DbNft | undefined {
  return db().nfts.find((nft) => nft.id === nftId);
}

/** Comparação de texto sem diferenciar maiúsculas e acentos. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Filters = Required<Pick<NftListParams, "categories" | "networks">> &
  Pick<NftListParams, "q" | "minPrice" | "maxPrice" | "tab">;

function matches(nft: DbNft, filters: Filters, skip?: "categories" | "networks"): boolean {
  if (filters.q) {
    const haystack = normalize(`${nft.name} ${nft.tokenId} ${nft.collection} ${nft.category.name}`);
    const terms = normalize(filters.q).split(/\s+/).filter(Boolean);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }
  if (skip !== "categories" && filters.categories.length > 0) {
    if (!filters.categories.includes(nft.category.id)) return false;
  }
  if (skip !== "networks" && filters.networks.length > 0) {
    if (!filters.networks.includes(nft.network)) return false;
  }
  if (filters.minPrice && compareEth(nft.price, filters.minPrice) < 0) return false;
  if (filters.maxPrice && compareEth(nft.price, filters.maxPrice) > 0) return false;
  if (filters.tab === "novos" && !nft.isNew) return false;
  if (filters.tab === "em-alta" && !nft.trending) return false;
  return true;
}

function sortNfts(nfts: DbNft[], sort: NftListParams["sort"]): DbNft[] {
  const sorted = [...nfts];
  switch (sort) {
    case "preco-asc":
      return sorted.sort((a, b) => compareEth(a.price, b.price) || a.name.localeCompare(b.name));
    case "preco-desc":
      return sorted.sort((a, b) => compareEth(b.price, a.price) || a.name.localeCompare(b.name));
    case "nome":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    default:
      return sorted.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
  }
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function listNfts(params: NftListParams): NftListResponse {
  const source = getConfig().emptyCatalog ? [] : db().nfts;
  const filters: Filters = {
    q: params.q?.trim() || undefined,
    categories: params.categories ?? [],
    networks: params.networks ?? [],
    minPrice: params.minPrice && isEthAmount(params.minPrice) ? params.minPrice : undefined,
    maxPrice: params.maxPrice && isEthAmount(params.maxPrice) ? params.maxPrice : undefined,
    tab: params.tab,
  };

  const filtered = sortNfts(
    source.filter((nft) => matches(nft, filters)),
    params.sort,
  );

  const pageSize = clampInt(params.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // página além do fim devolve a última página válida em vez de uma lista vazia
  const page = clampInt(params.page, 1, 1, totalPages);
  const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(toNftSummary);

  // cada faceta é contada ignorando o próprio filtro, para mostrar quantos itens
  // cada opção acrescentaria à seleção atual
  const forCategories = source.filter((nft) => matches(nft, filters, "categories"));
  const forNetworks = source.filter((nft) => matches(nft, filters, "networks"));

  const categories: Facet[] = CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    count: forCategories.filter((nft) => nft.category.id === category.id).length,
  }));

  const networks: Facet<Network>[] = (Object.keys(NETWORK_LABELS) as Network[]).map((network) => ({
    id: network,
    name: NETWORK_LABELS[network],
    count: forNetworks.filter((nft) => nft.network === network).length,
  }));

  const prices = [...source].sort((a, b) => compareEth(a.price, b.price));

  return {
    items,
    page,
    pageSize,
    total: filtered.length,
    totalPages,
    facets: {
      categories,
      networks,
      priceRange: { min: prices[0]?.price ?? "0", max: prices.at(-1)?.price ?? "0" },
    },
  };
}
