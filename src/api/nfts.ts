import type { NftDetail, NftListParams, NftListResponse } from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

/** Converte os filtros no formato de query string do contrato (listas separadas por vírgula). */
export function toNftListQuery(params: NftListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.q) query.q = params.q;
  if (params.categories?.length) query.categories = params.categories.join(",");
  if (params.networks?.length) query.networks = params.networks.join(",");
  if (params.minPrice) query.minPrice = params.minPrice;
  if (params.maxPrice) query.maxPrice = params.maxPrice;
  if (params.tab) query.tab = params.tab;
  if (params.sort) query.sort = params.sort;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;
  return query;
}

export async function listNfts(params: NftListParams, options?: RequestOptions) {
  const { data } = await http.get<NftListResponse>("/nfts", {
    ...options,
    params: toNftListQuery(params),
  });
  return data;
}

export async function getNft(nftId: string, options?: RequestOptions) {
  const { data } = await http.get<NftDetail>(`/nfts/${encodeURIComponent(nftId)}`, options);
  return data;
}
