import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import type { FavoritesResponse } from "@/api/contracts";
import { addFavorite, getFavorites, removeFavorite } from "@/api/favorites";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey, useSessionToken } from "@/lib/use-session-token";

// favoritos do usuário
export function useFavorites() {
  const token = useSessionToken();
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: queryKeys.favorites(sessionKey),
    queryFn: ({ signal }) => getFavorites({ signal }),
    enabled: token !== null,
    staleTime: 60_000,
  });
}

/**
 * Alterna o favorito com atualização otimista: a interface muda na hora e, se a
 * API falhar, volta ao estado anterior e avisa o usuário.
 * Visitantes são levados ao login e retornam à página em que estavam.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const token = useSessionToken();
  const sessionKey = useSessionKey();
  const currentHref = useRouterState({ select: (state) => state.location.href });
  const key = queryKeys.favorites(sessionKey);

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? addFavorite(nftId) : removeFavorite(nftId),

    onMutate: async ({ nftId, favorite }) => {
      // evita que uma resposta antiga de consulta sobrescreva o estado otimista
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FavoritesResponse>(key);
      queryClient.setQueryData<FavoritesResponse>(key, (current) => {
        const ids = new Set(current?.nftIds ?? []);
        if (favorite) ids.add(nftId);
        else ids.delete(nftId);
        return { nftIds: [...ids] };
      });
      return { previous };
    },

    onError: (_error, { favorite, name }, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error(
        favorite
          ? `Não foi possível favoritar ${name}. Tente novamente.`
          : `Não foi possível remover ${name} dos favoritos. Tente novamente.`,
      );
    },

    onSuccess: (data, { favorite, name }) => {
      queryClient.setQueryData(key, data);
      toast.success(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`);
    },
  });

  return {
    isPending: mutation.isPending,
    toggle(nft: { id: string; name: string }, favorite: boolean) {
      if (token === null) {
        void navigate({ to: "/entrar", search: { redirect: currentHref } });
        return;
      }
      mutation.mutate({ nftId: nft.id, favorite, name: nft.name });
    },
  };
}
