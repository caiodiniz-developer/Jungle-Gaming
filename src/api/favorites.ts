import type { FavoritesResponse } from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

export async function getFavorites(options?: RequestOptions) {
  const { data } = await http.get<FavoritesResponse>("/favorites", options);
  return data;
}

export async function addFavorite(nftId: string) {
  const { data } = await http.put<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`);
  return data;
}

export async function removeFavorite(nftId: string) {
  const { data } = await http.delete<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`);
  return data;
}
