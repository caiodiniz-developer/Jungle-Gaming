import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import type { NftDetail, NftListResponse, NftUpdatedEvent } from "@/api/contracts";
import { formatEthLabel } from "@/lib/eth";
import { queryKeys } from "@/lib/query-keys";
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

    socket.on("connect", onConnect);
    socket.on("nft.updated", onNftUpdated);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("nft.updated", onNftUpdated);
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
