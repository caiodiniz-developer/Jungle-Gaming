import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import type {
  NftDetail,
  NftListResponse,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
} from "@/api/contracts";
import { formatEthLabel } from "@/lib/eth";
import { GUEST_SESSION_KEY, queryKeys } from "@/lib/query-keys";
import { getSessionToken } from "@/lib/session-storage";
import { useSessionToken } from "@/lib/use-session-token";
import { eventGate } from "@/realtime/gate";
import { getSocket } from "@/realtime/socket";

/**
 * Aplica um nft.updated ao cache: listas e detalhe recebem o novo preço e a
 * nova disponibilidade na hora; o carrinho é recalculado pela API, que é a
 * referência dos valores.
 */
function applyNftUpdate(queryClient: QueryClient, event: NftUpdatedEvent) {
  const { nft, editions } = event.data;

  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (list) =>
    list && {
      ...list,
      items: list.items.map((item) => (item.id === nft.id ? nft : item)),
    },
  );

  const detailKey = queryKeys.nfts.detail(nft.id);
  const previous = queryClient.getQueryData<NftDetail>(detailKey);
  if (previous) {
    queryClient.setQueryData<NftDetail>(detailKey, {
      ...previous,
      ...nft,
      editions,
      related: previous.related,
    });

    // avisa só quem está com este NFT aberto
    const watching = (queryClient.getQueryCache().find({ queryKey: detailKey })?.getObserversCount() ?? 0) > 0;
    if (watching && previous.price !== nft.price) {
      toast.info(`O preço de ${nft.name} mudou.`, {
        description: `De ${formatEthLabel(previous.price)} para ${formatEthLabel(nft.price)}.`,
      });
    }
  }

  void queryClient.invalidateQueries({ queryKey: ["cart"] });
  void queryClient.invalidateQueries({ queryKey: ["quote"] });
}

/**
 * Aplica um order.updated: o pedido em cache passa ao novo estado e o carrinho
 * é recalculado (a confirmação remove dele os itens comprados).
 */
function applyOrderUpdate(queryClient: QueryClient, event: OrderUpdatedEvent) {
  const { order } = event.data;
  const sessionKey = getSessionToken() ?? GUEST_SESSION_KEY;
  const orderKey = queryKeys.order(sessionKey, order.id);
  queryClient.setQueryData<Order>(orderKey, order);
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders(sessionKey) });

  // quem não está na página do pedido é avisado do resultado
  const watching = (queryClient.getQueryCache().find({ queryKey: orderKey })?.getObserversCount() ?? 0) > 0;
  if (!watching && order.status === "confirmed") {
    toast.success(`Pedido ${order.id} confirmado.`);
  } else if (!watching && order.status === "rejected") {
    toast.error(`Pedido ${order.id} recusado.`, { description: order.rejectionReason ?? undefined });
  }

  void queryClient.invalidateQueries({ queryKey: ["cart"] });
  void queryClient.invalidateQueries({ queryKey: ["quote"] });
}

/**
 * Mantém a conexão Socket.IO durante a vida da aplicação e sincroniza os
 * eventos com o cache do TanStack Query.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSessionToken();

  useEffect(() => {
    const socket = getSocket();
    let connectedBefore = false;

    const onConnect = () => {
      const currentToken = getSessionToken();
      if (currentToken) socket.emit("session.join", { token: currentToken });
      // reconexão: eventos podem ter sido perdidos enquanto estava fora do ar,
      // então os recursos em tela são reconciliados com a API REST
      if (connectedBefore) void queryClient.invalidateQueries({ type: "active" });
      connectedBefore = true;
    };

    const onNftUpdated = (event: NftUpdatedEvent) => {
      // descarta duplicatas e eventos mais antigos que o estado já conhecido
      if (!eventGate.accept(event)) return;
      applyNftUpdate(queryClient, event);
    };

    const onOrderUpdated = (event: OrderUpdatedEvent) => {
      if (!eventGate.accept(event)) return;
      applyOrderUpdate(queryClient, event);
    };

    socket.on("connect", onConnect);
    socket.on("nft.updated", onNftUpdated);
    socket.on("order.updated", onOrderUpdated);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("nft.updated", onNftUpdated);
      socket.off("order.updated", onOrderUpdated);
      socket.disconnect();
    };
  }, [queryClient]);

  // login e logout: associa ou desassocia a conexão da sessão
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) return;
    if (token) socket.emit("session.join", { token });
    else socket.emit("session.leave");
  }, [token]);

  return children;
}
