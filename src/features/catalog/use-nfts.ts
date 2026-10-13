import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { NftListParams } from "@/api/contracts";
import { getNft, listNfts } from "@/api/nfts";
import { queryKeys } from "@/lib/query-keys";
import { eventGate } from "@/realtime/gate";

export function nftListOptions(params: NftListParams) {
  return queryOptions({
    queryKey: queryKeys.nfts.list(params),
    // o `signal` cancela a requisição quando os filtros mudam antes da resposta
    queryFn: async ({ signal }) => {
      const data = await listNfts(params, { signal });
      for (const nft of data.items) eventGate.observe("nft", nft.id, nft.version);
      return data;
    },
  });
}

export function nftDetailOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: async ({ signal }) => {
      const data = await getNft(nftId, { signal });
      eventGate.observe("nft", data.id, data.version);
      return data;
    },
  });
}

export function useNftList(params: NftListParams) {
  return useQuery({
    ...nftListOptions(params),
    // mantém a página anterior visível enquanto a nova carrega (sem piscar o layout)
    placeholderData: keepPreviousData,
  });
}

export function useNftDetail(nftId: string) {
  return useQuery(nftDetailOptions(nftId));
}
