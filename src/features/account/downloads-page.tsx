import { NftImage } from "@/components/nft-image";
import {
  SectionEmpty,
  SectionError,
  SectionLoading,
  SectionTitle,
} from "@/features/account/section-states";
import { useOrders } from "@/features/orders/use-order";

/**
 * Arquivos (e "Minha coleção" do rodapé): a arte em alta resolução dos NFTs de
 * pedidos confirmados, para baixar. Pedidos pendentes ou recusados não entram.
 */
export function DownloadsPage() {
  const orders = useOrders();
  const lines = (orders.data ?? [])
    .filter((order) => order.status === "confirmed")
    .flatMap((order) => order.lines.map((line) => ({ ...line, orderId: order.id })));

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle description="A arte em alta resolução dos NFTs que você comprou.">
        Arquivos baixados
      </SectionTitle>
      {orders.isPending ? (
        <SectionLoading label="Carregando arquivos" />
      ) : orders.isError ? (
        <SectionError message={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : lines.length === 0 ? (
        <SectionEmpty>Os arquivos ficam disponíveis aqui depois que uma compra é confirmada.</SectionEmpty>
      ) : (
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li
              key={`${line.orderId}:${line.nftId}:${line.editionId}`}
              className="flex items-center gap-3 bg-surface pr-4"
            >
              <NftImage artwork={line.artwork} alt="" size={70} className="size-[70px] shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-base leading-5 font-bold">{line.name}</p>
                <p className="truncate text-sm leading-5 text-subtle">
                  ID do token: #{line.tokenId} · Edição {line.editionLabel} · Pedido {line.orderId}
                </p>
              </div>
              <a
                href={`/nfts/${line.artwork}-900.webp`}
                download={`${line.name}.webp`}
                className="shrink-0 text-sm font-bold text-highlight underline underline-offset-2"
              >
                Baixar<span className="sr-only"> a arte de {line.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
