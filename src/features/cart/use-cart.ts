import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddCartItemRequest } from "@/api/contracts";
import { addCartItem, getCart } from "@/api/cart";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey } from "@/lib/use-session-token";

export function useCart() {
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: queryKeys.cart(sessionKey),
    queryFn: ({ signal }) => getCart({ signal }),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  return useMutation({
    mutationFn: (body: AddCartItemRequest) => addCartItem(body),
    // a resposta já é o carrinho atualizado: grava direto no cache, sem nova consulta
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(sessionKey), cart),
  });
}
