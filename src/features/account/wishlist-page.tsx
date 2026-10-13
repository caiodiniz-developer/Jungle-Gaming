import { useQueries } from "@tanstack/react-query";
import {
  SectionEmpty,
  SectionError,
  SectionLoading,
  SectionTitle,
} from "@/features/account/section-states";
import { NftCard, NftCardSkeleton } from "@/features/catalog/nft-card";
import { nftDetailOptions } from "@/features/catalog/use-nfts";
import { useFavorites } from "@/features/favorites/use-favorites";

/** Lista de interesse: os NFTs favoritados pela conta. */
export function WishlistPage() {
  const favorites = useFavorites();
  const ids = favorites.data?.nftIds ?? [];
  const nfts = useQueries({ queries: ids.map((id) => nftDetailOptions(id)) });

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle description="NFTs que você favoritou.">Lista de interesse</SectionTitle>
      {favorites.isPending ? (
        <SectionLoading label="Carregando lista de interesse" />
      ) : favorites.isError ? (
        <SectionError message={favorites.error.message} onRetry={() => void favorites.refetch()} />
      ) : ids.length === 0 ? (
        <SectionEmpty>
          Sua lista de interesse está vazia. Use o coração nos cards para guardar um NFT.
        </SectionEmpty>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-[34px] lg:gap-y-12">
          {nfts.map((query, index) => (
            <li key={ids[index]}>{query.data ? <NftCard nft={query.data} /> : <NftCardSkeleton />}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
