import { createFileRoute, Link } from "@tanstack/react-router";
import { NotFound } from "@/components/not-found";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { nftDetailOptions, useNftDetail } from "@/features/catalog/use-nfts";
import { NftDetailView } from "@/features/nft/nft-detail-view";

export const Route = createFileRoute("/nft/$nftId")({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailOptions(params.nftId));
  },
  component: NftDetailPage,
});

/** Mesmas dimensões do conteúdo final, para a página não "pular" quando os dados chegam. */
function DetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="container-page pt-6 pb-24 lg:pt-8">
      <Skeleton className="hidden h-4 w-40 lg:block" />
      <div className="flex flex-col gap-8 lg:mt-3 lg:flex-row">
        <div className="flex w-full flex-col-reverse items-center gap-4 lg:w-[573px] lg:flex-row lg:items-start lg:gap-7">
          <div className="flex gap-3 lg:w-[100px] lg:flex-col lg:gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="size-[64px] rounded-lg lg:size-[100px]" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full max-w-[444px]" />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[72px] w-full" />
          <Skeleton className="h-7 w-52 rounded-full" />
          <Skeleton className="h-[50px] w-full" />
          <Skeleton className="h-20 w-64" />
        </div>
      </div>
    </div>
  );
}

function NftDetailPage() {
  const { nftId } = Route.useParams();
  const query = useNftDetail(nftId);

  if (query.isPending) return <DetailSkeleton />;

  if (query.isError) {
    if (query.error.code === "NOT_FOUND") {
      return (
        <NotFound
          title="NFT não encontrado"
          description="Este item não existe ou foi removido do mercado."
        />
      );
    }
    return (
      <section
        role="alert"
        className="container-page flex min-h-[50vh] flex-col items-start justify-center gap-4 py-16"
      >
        <h1 className="text-[28px] font-bold">Não foi possível carregar este NFT</h1>
        <p className="max-w-xl text-sm leading-6 text-sand">{query.error.message}</p>
        <div className="flex gap-3">
          <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? "Tentando…" : "Tentar novamente"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </section>
    );
  }

  // a chave remonta a tela ao trocar de NFT: edição e quantidade voltam ao padrão
  return <NftDetailView key={query.data.id} nft={query.data} />;
}
