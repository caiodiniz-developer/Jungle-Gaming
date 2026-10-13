import type { FavoritesResponse, Network, NftListParams, NftSort, NftTab } from "@/api/contracts";
import { commit, db } from "@/mocks/db";
import { findNft, listNfts, toNftDetail } from "@/mocks/domain/catalog";
import { fail, json, requireUser, route } from "@/mocks/http";

// abas aceitas
const TABS: NftTab[] = ["todos", "novos", "em-alta"];
// ordenações aceitas
const SORTS: NftSort[] = ["recentes", "preco-asc", "preco-desc", "nome"];
// redes aceitas
const NETWORKS: Network[] = ["ethereum", "polygon", "solana"];

// "a,b" → ["a", "b"]
function list(value: string | null): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

// texto → inteiro
function integer(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

// query string → parâmetros da listagem
function parseListParams(query: URLSearchParams): NftListParams {
  const tab = query.get("tab") as NftTab | null;
  const sort = query.get("sort") as NftSort | null;
  return {
    q: query.get("q") ?? undefined,
    categories: list(query.get("categories")),
    networks: list(query.get("networks")).filter((item): item is Network =>
      NETWORKS.includes(item as Network),
    ),
    minPrice: query.get("minPrice") ?? undefined,
    maxPrice: query.get("maxPrice") ?? undefined,
    tab: tab && TABS.includes(tab) ? tab : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: integer(query.get("page")),
    pageSize: integer(query.get("pageSize")),
  };
}

// favoritos de um usuário
function favoritesOf(userId: string): string[] {
  const favorites = db().favorites;
  favorites[userId] ??= [];
  return favorites[userId];
}

// rotas de NFTs e favoritos
export const catalogHandlers = [
  route("get", "/nfts", ({ url }) => json(listNfts(parseListParams(url.searchParams)))),

  route("get", "/nfts/:nftId", ({ params }) => {
    const nft = findNft(params.nftId ?? "");
    if (!nft) fail(404, "NOT_FOUND", "NFT não encontrado.");
    return json(toNftDetail(nft));
  }),

  route("get", "/favorites", ({ request }) => {
    const user = requireUser(request);
    return json<FavoritesResponse>({ nftIds: [...favoritesOf(user.id)] });
  }),

  route("put", "/favorites/:nftId", ({ request, params }) => {
    const user = requireUser(request);
    const nftId = params.nftId ?? "";
    if (!findNft(nftId)) fail(404, "NOT_FOUND", "NFT não encontrado.");
    const favorites = favoritesOf(user.id);
    if (!favorites.includes(nftId)) favorites.push(nftId);
    commit();
    return json<FavoritesResponse>({ nftIds: [...favorites] });
  }),

  route("delete", "/favorites/:nftId", ({ request, params }) => {
    const user = requireUser(request);
    const current = db();
    current.favorites[user.id] = favoritesOf(user.id).filter((id) => id !== params.nftId);
    commit();
    return json<FavoritesResponse>({ nftIds: [...(current.favorites[user.id] ?? [])] });
  }),
];
