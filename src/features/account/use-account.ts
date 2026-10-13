import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Wallet, WalletInput } from "@/api/contracts";
import { changePassword, removeAvatar, updateAvatar, updateProfile } from "@/api/profile";
import { createWallet, listWallets, updateWallet } from "@/api/wallets";
import { useUpdateCachedUser } from "@/features/auth/session";
import { queryKeys } from "@/lib/query-keys";
import { useSessionKey, useSessionToken } from "@/lib/use-session-token";

export function useUpdateProfile() {
  const updateCachedUser = useUpdateCachedUser();
  return useMutation({ mutationFn: updateProfile, onSuccess: updateCachedUser });
}

export function useUpdateAvatar() {
  const updateCachedUser = useUpdateCachedUser();
  return useMutation({ mutationFn: updateAvatar, onSuccess: updateCachedUser });
}

export function useRemoveAvatar() {
  const updateCachedUser = useUpdateCachedUser();
  return useMutation({ mutationFn: removeAvatar, onSuccess: updateCachedUser });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useWallets() {
  const token = useSessionToken();
  const sessionKey = useSessionKey();
  return useQuery({
    queryKey: queryKeys.wallets(sessionKey),
    queryFn: ({ signal }) => listWallets({ signal }),
    enabled: token !== null,
  });
}

/** Cria ou atualiza uma carteira e grava o resultado direto na lista em cache. */
export function useSaveWallet() {
  const queryClient = useQueryClient();
  const sessionKey = useSessionKey();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: WalletInput }) =>
      id ? updateWallet(id, input) : createWallet(input),
    onSuccess: (saved) => {
      queryClient.setQueryData<Wallet[]>(queryKeys.wallets(sessionKey), (wallets = []) =>
        wallets.some((wallet) => wallet.id === saved.id)
          ? wallets.map((wallet) => (wallet.id === saved.id ? saved : wallet))
          : [...wallets, saved],
      );
    },
  });
}
