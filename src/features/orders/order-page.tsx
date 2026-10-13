import { Link } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import type { Order } from "@/api/contracts";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from "@/api/contracts";
import closeIcon from "@/assets/icons/close.svg";
import dangerIcon from "@/assets/icons/danger.svg";
import { Icon } from "@/components/icon";
import { NftImage } from "@/components/nft-image";
import { NotFound } from "@/components/not-found";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder } from "@/features/orders/use-order";
import { formatEthLabel, isZeroEth, shortenHash } from "@/lib/eth";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

/** Ícone "THANK YOU" do recibo, redesenhado a partir do PNG do layout (o original não foi exportado). */
function ThankYouIcon() {
  return (
    <svg
      viewBox="0 0 68 82"
      aria-hidden="true"
      className="h-[82px] w-[68px] text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M2 36v42a2 2 0 0 0 2 2h60a2 2 0 0 0 2-2V36" />
      <path d="M2 78 26 52M66 78 42 52M2 36l32 24 32-24" />
      <path d="M8 40V10a2 2 0 0 1 2-2h48a2 2 0 0 1 2 2v30" />
      <path d="M28 8a6 6 0 0 1 12 0" />
      <text
        x="34"
        y="24"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        THANK
      </text>
      <text
        x="34"
        y="37"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        YOU
      </text>
    </svg>
  );
}

function StatusHeader({ order }: { order: Order }) {
  if (order.status === "confirmed") {
    return (
      <>
        <ThankYouIcon />
        <h1 className="text-base leading-6 font-bold text-sand">Seus NFTs agora estão na sua carteira</h1>
      </>
    );
  }
  if (order.status === "rejected") {
    return (
      <>
        <Icon src={dangerIcon} className="size-12 text-coral" />
        <h1 className="text-base leading-6 font-bold">Pagamento recusado</h1>
        <p className="max-w-[420px] text-sm leading-[22px] text-sand">
          {order.rejectionReason ?? "A transação não foi concluída."} Nada foi cobrado e os itens
          continuam no seu carrinho.
        </p>
      </>
    );
  }
  return (
    <>
      <LoaderCircleIcon aria-hidden="true" className="size-12 animate-spin text-primary" />
      <h1 className="text-base leading-6 font-bold">Aguardando a confirmação na rede</h1>
      <p className="max-w-[420px] text-sm leading-[22px] text-sand">
        Seu pedido foi enviado. Esta página se atualiza sozinha quando a transação for concluída —
        você pode sair e voltar depois.
      </p>
    </>
  );
}

function OrderReceipt({ order }: { order: Order }) {
  const facts = [
    order.transaction
      ? { label: "ID da transação", value: shortenHash(order.transaction.hash), title: order.transaction.hash }
      : { label: "Pedido", value: order.id },
    { label: "Data", value: dateFormat.format(new Date(order.createdAt)) },
    { label: "Total", value: formatEthLabel(order.total) },
    { label: "Carteira", value: WALLET_PROVIDER_LABELS[order.wallet.provider] },
  ];

  return (
    <article
      data-testid="order"
      data-status={order.status}
      className="relative mx-auto w-full max-w-[578px] border-b-[10px] border-primary bg-surface pb-10"
    >
      <Link
        to="/"
        aria-label="Fechar e voltar ao início"
        className="absolute top-2.5 right-3 flex size-8 items-center justify-center text-primary transition-colors hover:text-highlight"
      >
        <Icon src={closeIcon} className="size-[18px]" />
      </Link>

      {/* região viva: a mudança de pendente para confirmado/recusado é anunciada */}
      <div role="status" className="flex flex-col items-center gap-3 px-6 pt-6 pb-5 text-center">
        <StatusHeader order={order} />
      </div>

      <dl className="grid grid-cols-2 gap-y-4 border-y border-primary px-6 py-4 text-sm leading-[19px] text-sand sm:flex sm:justify-between sm:px-9">
        {facts.map((fact, index) => (
          <div key={fact.label} className={index > 0 ? "sm:border-l sm:border-primary sm:pl-4" : undefined}>
            <dt className={index === 0 || index === 3 ? "font-bold" : undefined}>{fact.label}</dt>
            <dd title={fact.title}>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-5 px-6 pt-6 sm:px-11">
        <table className="w-full border-collapse text-left">
          <caption className="pb-3 text-left text-[15px] leading-4 font-bold">Detalhes da transação</caption>
          <thead>
            <tr className="border-b border-primary/50 text-base">
              <th scope="col" className="pb-2.5 font-medium">
                NFTs
              </th>
              <th scope="col" className="px-2 pb-2.5 text-center font-medium">
                Edições
              </th>
              <th scope="col" className="pb-2.5 text-right font-medium">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={`${line.nftId}:${line.editionId}`}>
                <th scope="row" className="pt-3 font-normal">
                  <span className="flex items-center gap-3">
                    <NftImage artwork={line.artwork} alt="" size={70} className="size-[52px] shrink-0 rounded-lg sm:size-[70px]" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-base leading-5 font-bold">{line.name}</span>
                      <span className="text-sm leading-5 text-subtle">
                        ID do token: #{line.tokenId} · {line.editionLabel}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="px-2 pt-3 text-center text-sm whitespace-nowrap text-sand">
                  <span aria-hidden="true">(x {line.quantity})</span>
                  <span className="sr-only">{line.quantity}</span>
                </td>
                <td className="pt-3 text-right text-base font-bold whitespace-nowrap text-highlight sm:text-lg">
                  {formatEthLabel(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto flex w-full max-w-[322px] flex-col gap-2 border-b border-primary/50 pb-3 text-[15px]">
          {!isZeroEth(order.discount) && (
            <div className="flex items-baseline justify-between gap-4">
              <dt>{order.coupon ? `${order.coupon.description} (${order.coupon.code})` : "Desconto"}</dt>
              <dd className="text-lg whitespace-nowrap">- {formatEthLabel(order.discount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <dt>Taxa de rede</dt>
            <dd className="text-lg">{formatEthLabel(order.networkFee)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-base font-bold">Total</dt>
            <dd data-testid="order-total" className="text-lg font-bold text-highlight">
              {formatEthLabel(order.total)}
            </dd>
          </div>
        </dl>

        {order.status === "confirmed" && order.transaction && (
          <div className="flex flex-col items-center gap-5">
            <p className="text-center text-sm leading-[22px] text-sand">
              Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida
              para sua carteira conectada e registrada na rede.
            </p>
            <Button asChild size="lg" className="text-base">
              <a href={order.transaction.explorerUrl} target="_blank" rel="noopener noreferrer">
                Ver no Etherscan
                <span className="sr-only"> (abre em nova aba; transação simulada)</span>
              </a>
            </Button>
          </div>
        )}

        {order.status === "rejected" && (
          <Button asChild size="lg" className="self-center text-base">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        )}

        {order.status === "pending" && (
          <p className="text-center text-sm leading-[22px] text-sand">
            Os itens permanecem no carrinho até a confirmação.
          </p>
        )}
      </div>
    </article>
  );
}

export function OrderPage({ orderId }: { orderId: string }) {
  const { data: order, isPending, error, refetch } = useOrder(orderId);

  if (order) {
    return (
      <div className="container-page py-8 lg:py-16">
        <OrderReceipt order={order} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="container-page py-8 lg:py-16">
        <div role="status" aria-label="Carregando pedido" className="mx-auto flex w-full max-w-[578px] flex-col gap-4">
          <Skeleton className="h-[150px]" />
          <Skeleton className="h-[66px]" />
          <Skeleton className="h-[320px]" />
        </div>
      </div>
    );
  }

  if (error?.status === 404) {
    return (
      <NotFound
        title="Pedido não encontrado"
        description="Não existe pedido com este identificador. Confira o endereço ou volte ao mercado."
      />
    );
  }

  return (
    <section role="alert" className="container-page flex min-h-[50vh] flex-col items-start justify-center gap-4 py-16">
      <h1 className="text-[28px] font-bold">
        {error?.status === 403 ? "Este pedido pertence a outra conta" : "Não foi possível carregar o pedido"}
      </h1>
      <p className="max-w-xl text-sm leading-6 text-sand">
        {error?.status === 403
          ? "Entre com a conta que fez a compra para ver os detalhes deste pedido."
          : error?.message}
      </p>
      {error?.status === 403 ? (
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      ) : (
        <Button onClick={() => void refetch()}>Tentar novamente</Button>
      )}
    </section>
  );
}
