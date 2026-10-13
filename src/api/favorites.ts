import type { FavoritesResponse } from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

// lista os ids dos NFTs favoritados
export async function getFavorites(options?: RequestOptions) {
  const { data } = await http.get<FavoritesResponse>("/favorites", options);
  return data;
}

// adiciona um NFT aos favoritos
export async function addFavorite(nftId: string) {
  const { data } = await http.put<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`);
  return data;
}

// remove um NFT dos favoritos
export async function removeFavorite(nftId: string) {
  const { data } = await http.delete<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`);
  return data;
}
