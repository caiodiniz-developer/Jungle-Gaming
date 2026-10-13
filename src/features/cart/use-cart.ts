import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddCartItemRequest, Cart, Network } from "@/api/contracts";
import {
  addCartItem,
  applyCoupon,
  createQuote,
  getCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "@/api/cart";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey } from "@/lib/use-session-token";

/**
 * Todas as alterações do carrinho compartilham a mesma chave e o mesmo escopo:
 * o escopo faz o TanStack Query enviá-las uma de cada vez, na ordem dos
 * cliques, então uma resposta atrasada nunca sobrescreve uma mais recente.
 */
const CART_MUTATION_KEY = ["cart-mutation"] as const;
const CART_SCOPE = { id: "cart" } as const;

export function useCart() {
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: queryKeys.cart(sessionKey),
    queryFn: ({ signal }) => getCart({ signal }),
  });
}

/**
 * Cotação do carrinho atual. Subtotal, desconto, taxa e total vêm sempre daqui:
 * a interface nunca calcula valores. É refeita a cada alteração do carrinho.
 */
export function useQuote(network: Network, enabled = true) {
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: queryKeys.quote(sessionKey, network),
    queryFn: ({ signal }) => createQuote({ network }, { signal }),
    enabled,
    staleTime: 0,
  });
}

/** Grava o carrinho devolvido pela API e pede nova cotação. */
function useCartSync() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  const cartKey = queryKeys.cart(sessionKey);

  return {
    queryClient,
    cartKey,
    /** Só a última alteração da fila atualiza o cache: as anteriores já estão defasadas. */
    isLastMutation: () => queryClient.isMutating({ mutationKey: CART_MUTATION_KEY }) === 1,
    apply(cart: Cart) {
      queryClient.setQueryData(cartKey, cart);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotes(sessionKey) });
    },
    refresh() {
      void queryClient.invalidateQueries({ queryKey: cartKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotes(sessionKey) });
    },
  };
}

export function useAddToCart() {
  const sync = useCartSync();
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: (body: AddCartItemRequest) => addCartItem(body),
    // a resposta já é o carrinho atualizado: grava direto no cache, sem nova consulta
    onSuccess: (cart) => sync.apply(cart),
  });
}

/** Aplica a alteração no cache antes da resposta e devolve o estado anterior para o rollback. */
async function optimisticCart(
  sync: ReturnType<typeof useCartSync>,
  update: (cart: Cart) => Cart["lines"],
) {
  // evita que uma consulta em andamento sobrescreva o estado otimista
  await sync.queryClient.cancelQueries({ queryKey: sync.cartKey });
  const previous = sync.queryClient.getQueryData<Cart>(sync.cartKey);
  if (previous) {
    const lines = update(previous);
    sync.queryClient.setQueryData<Cart>(sync.cartKey, {
      ...previous,
      lines,
      itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    });
  }
  return { previous };
}

/**
 * Altera a quantidade de uma linha com atualização otimista: o número muda na
 * hora; os valores (total da linha, resumo) só mudam com a resposta da API.
 */
export function useUpdateCartItem() {
  const sync = useCartSync();
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateCartItem(lineId, { quantity }),
    onMutate: ({ lineId, quantity }) =>
      optimisticCart(sync, (cart) =>
        cart.lines.map((line) => (line.id === lineId ? { ...line, quantity } : line)),
      ),
    onError: (_error, _variables, context) => {
      if (context?.previous) sync.queryClient.setQueryData(sync.cartKey, context.previous);
      // a falha pode ser de disponibilidade: busca o estado real
      if (sync.isLastMutation()) sync.refresh();
    },
    onSuccess: (cart) => {
      if (sync.isLastMutation()) sync.apply(cart);
    },
  });
}

export function useRemoveCartItem() {
  const sync = useCartSync();
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: ({ lineId }: { lineId: string }) => removeCartItem(lineId),
    onMutate: ({ lineId }) =>
      optimisticCart(sync, (cart) => cart.lines.filter((line) => line.id !== lineId)),
    onError: (_error, _variables, context) => {
      if (context?.previous) sync.queryClient.setQueryData(sync.cartKey, context.previous);
      if (sync.isLastMutation()) sync.refresh();
    },
    onSuccess: (cart) => {
      if (sync.isLastMutation()) sync.apply(cart);
    },
  });
}

export function useApplyCoupon() {
  const sync = useCartSync();
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: (code: string) => applyCoupon({ code }),
    onSuccess: (cart) => sync.apply(cart),
  });
}

export function useRemoveCoupon() {
  const sync = useCartSync();
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: () => removeCoupon(),
    onSuccess: (cart) => sync.apply(cart),
  });
}

/** Há alteração do carrinho em andamento: os valores em tela ainda não a refletem. */
export function useIsCartMutating(): boolean {
  return useIsMutating({ mutationKey: CART_MUTATION_KEY }) > 0;
}
