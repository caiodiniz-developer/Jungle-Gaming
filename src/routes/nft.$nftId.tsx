import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/nft/$nftId")({
  component: NftDetailPage,
});

function NftDetailPage() {
  return <PagePlaceholder title="Detalhes do NFT" description="Galeria, informações, edição, quantidade, favoritos e compra." />;
}
