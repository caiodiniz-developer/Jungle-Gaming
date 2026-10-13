import { Link } from "@tanstack/react-router";
import type { CreateOrderRequest, Quote, QuoteChange, QuoteStaleDetails } from "@/api/contracts";
import { NftImage } from "@/components/nft-image";
import { Button } from "@/components/ui/button";
import { formatEthLabel } from "@/lib/eth";

/** Itens do pedido, como na coluna "Seus NFTs" do layout. */
export function OrderLines({ quote }: { quote: Quote }) {
  return (
    <ul className="flex flex-col gap-3">
      {quote.lines.map((line) => (
        <li key={line.id} className="flex h-[70px] items-center gap-3 bg-surface pr-3">
          <NftImage artwork={line.artwork} alt="" size={70} className="size-[70px] shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-base leading-5 font-bold">{line.name}</p>
            <p className="truncate text-sm leading-5 text-subtle">ID do token: #{line.tokenId}</p>
          </div>
          <p className="shrink-0 text-sm text-sand">
            <span aria-hidden="true">(x {line.quantity})</span>
            <span className="sr-only">
              Edição {line.editionLabel}, quantidade {line.quantity}
            </span>
          </p>
          <p className="shrink-0 text-lg leading-5 font-bold text-highlight">{formatEthLabel(line.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}

function describeChange(change: QuoteChange): string {
  if (change.kind === "price") {
    return `O preço de ${change.name} mudou de ${change.from} para ${change.to}.`;
  }
  if (change.kind === "removed") return `${change.name} não está mais disponível.`;
  if (change.to === "0") return `${change.name} esgotou.`;
  return `A disponibilidade de ${change.name} mudou: agora há ${change.to} por pedido.`;
}

const noticeClass = "flex flex-col gap-2 rounded-sm border border-coral/60 bg-coral/10 p-3 text-sm leading-5";

type QuoteChangedNoticeProps = {
  /** Detalhes devolvidos pela API ao recusar a cotação antiga, quando houver. */
  stale: QuoteStaleDetails | null;
  quote: Quote;
  previousTotal: string | null;
};

/** Os valores mudaram desde a revisão: diz o que mudou e pede nova confirmação. */
export function QuoteChangedNotice({ stale, quote, previousTotal }: QuoteChangedNoticeProps) {
  const current = stale?.quote ?? quote;
  const changes = stale?.changes ?? [];

  return (
    <div role="alert" className={noticeClass}>
      <p className="font-bold">Os valores mudaram desde a sua revisão.</p>
      {changes.length > 0 && (
        <ul className="list-disc pl-5 text-sand">
          {changes.map((change) => (
            <li key={`${change.nftId}-${change.kind}`}>{describeChange(change)}</li>
          ))}
        </ul>
      )}
      <p>
        {!current.purchasable
          ? "Ajuste o carrinho para continuar."
          : stale || previousTotal === null
            ? `O novo total é ${formatEthLabel(current.total)}. Confira o resumo e confirme novamente.`
            : `O total passou de ${formatEthLabel(previousTotal)} para ${formatEthLabel(current.total)}. Confira o resumo e confirme novamente.`}
      </p>
    </div>
  );
}

/** Há linha indisponível: a compra só segue depois do ajuste no carrinho. */
export function BlockedNotice() {
  return (
    <div role="status" className="flex flex-col items-start gap-2 text-sm leading-5 text-coral">
      <p>Há itens indisponíveis no carrinho.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/carrinho">Voltar ao carrinho</Link>
      </Button>
    </div>
  );
}

type RetryNoticeProps = {
  body: CreateOrderRequest;
  message: string | null;
  isSending: boolean;
  onRetry: (body: CreateOrderRequest) => void;
};

/** O envio ficou sem resposta definitiva (timeout, rede, 5xx): repetir é seguro. */
export function RetryNotice({ body, message, isSending, onRetry }: RetryNoticeProps) {
  return (
    <div role="alert" className={`${noticeClass} items-start`}>
      <p className="font-bold">Não recebemos a confirmação do envio.</p>
      <p className="text-sand">
        {message} Tentar de novo é seguro: se o pedido já foi criado, ele será recuperado, sem
        cobrança em dobro.
      </p>
      <Button size="sm" disabled={isSending} onClick={() => onRetry(body)}>
        {isSending ? "Enviando pedido…" : "Tentar novamente"}
      </Button>
    </div>
  );
}
