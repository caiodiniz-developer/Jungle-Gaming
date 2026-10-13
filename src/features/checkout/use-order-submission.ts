import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import type { CreateOrderRequest, QuoteStaleDetails } from "@/api/contracts";
import { CHECKOUT_API_FIELDS, type CheckoutForm } from "@/features/checkout/checkout-schema";
import { clearOrderAttempt } from "@/features/checkout/order-attempt";
import { useSubmitOrder } from "@/features/checkout/use-checkout";
import { applyApiError } from "@/lib/form-errors";
import type { ApiError } from "@/lib/http";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey } from "@/lib/use-session-token";

function isQuoteStaleDetails(details: unknown): details is QuoteStaleDetails {
  return (
    typeof details === "object" &&
    details !== null &&
    "quote" in details &&
    "changes" in details &&
    Array.isArray(details.changes)
  );
}

type Options = {
  form: CheckoutForm;
  /** O servidor recusou o pedido porque a carteira não está conectada. */
  onWalletRejected: () => void;
};

/**
 * Envio do pedido e o que fazer com cada resposta. Cada código de erro da API
 * leva a uma recuperação diferente; nenhuma delas perde o formulário ou o carrinho.
 */
export function useOrderSubmission({ form, onWalletRejected }: Options) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  const order = useSubmitOrder();

  const [formError, setFormError] = useState<string | null>(null);
  /** Detalhes da cotação desatualizada devolvidos pela API. */
  const [stale, setStale] = useState<QuoteStaleDetails | null>(null);
  /** Corpo da tentativa que ficou sem resposta definitiva: repetir reenvia exatamente ele. */
  const [retryBody, setRetryBody] = useState<CreateOrderRequest | null>(null);

  function handleError(error: ApiError, body: CreateOrderRequest) {
    // 401: o SessionWatcher leva ao login e devolve o usuário ao pagamento
    if (error.isAuthError) return;

    switch (error.code) {
      case "QUOTE_STALE":
        if (!isQuoteStaleDetails(error.details)) break;
        // o resumo passa a mostrar os valores atuais; a compra exige nova confirmação
        queryClient.setQueryData(queryKeys.quote(sessionKey, body.network), error.details.quote);
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart(sessionKey) });
        setStale(error.details);
        return;

      case "AVAILABILITY_CONFLICT":
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart(sessionKey) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.quotes(sessionKey) });
        toast.warning("Há itens indisponíveis no carrinho.", {
          description: "Ajuste as quantidades para continuar a compra.",
        });
        void navigate({ to: "/carrinho" });
        return;

      case "WALLET_REJECTED":
        onWalletRejected();
        setFormError("A carteira não está conectada. Conecte-a novamente para confirmar a compra.");
        return;

      case "IDEMPOTENCY_CONFLICT":
        // a chave guardada pertence a outro conteúdo: a próxima confirmação abre uma tentativa nova
        clearOrderAttempt();
        setFormError("Não foi possível enviar o pedido. Confira os dados e confirme novamente.");
        return;
    }

    if (error.isTransient) {
      // a nova tentativa reusa a mesma chave de idempotência
      setRetryBody(body);
      return;
    }
    setFormError(applyApiError(error, form.setError, CHECKOUT_API_FIELDS));
  }

  return {
    isSending: order.isPending,
    formError,
    setFormError,
    stale,
    retryBody,
    /** Mensagem da falha transitória mais recente. */
    retryMessage: order.error?.message ?? null,

    send(body: CreateOrderRequest) {
      // clique repetido enquanto envia não gera outra requisição
      if (order.isPending) return;
      setFormError(null);
      setStale(null);
      setRetryBody(null);
      order.mutate(body, {
        onSuccess: (created) =>
          void navigate({ to: "/pedidos/$orderId", params: { orderId: created.id }, replace: true }),
        onError: (error) => handleError(error, body),
      });
    },
  };
}

export type OrderSubmission = ReturnType<typeof useOrderSubmission>;
