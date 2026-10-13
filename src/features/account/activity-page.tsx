import { Link } from "@tanstack/react-router";
import type { OrderStatus } from "@/api/contracts";
import {
  SectionEmpty,
  SectionError,
  SectionLoading,
  SectionTitle,
} from "@/features/account/section-states";
import { useOrders } from "@/features/orders/use-order";
import { formatEthLabel } from "@/lib/eth";

// texto de cada estado do pedido
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  rejected: "Recusado",
};

// formato da data do pedido
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

/** Atividade: os pedidos da conta, cada um com link para o recibo. */
export function ActivityPage() {
  const orders = useOrders();

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle description="Seus pedidos, do mais recente ao mais antigo.">Atividade</SectionTitle>
      {orders.isPending ? (
        <SectionLoading label="Carregando atividade" />
      ) : orders.isError ? (
        <SectionError message={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : orders.data.length === 0 ? (
        <SectionEmpty>Você ainda não fez nenhum pedido.</SectionEmpty>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.data.map((order) => {
            const count = order.lines.reduce((total, line) => total + line.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  to="/pedidos/$orderId"
                  params={{ orderId: order.id }}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-surface px-4 py-3 transition-colors hover:bg-surface-raised"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-base leading-5 font-bold">Pedido {order.id}</span>
                    <span className="text-sm leading-5 text-subtle">
                      {dateFormat.format(new Date(order.createdAt))} · {count} {count === 1 ? "NFT" : "NFTs"}
                    </span>
                  </span>
                  <span className="flex items-center gap-6">
                    <span className="text-sm text-sand">{STATUS_LABELS[order.status]}</span>
                    <span className="text-base font-bold text-highlight">{formatEthLabel(order.total)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
