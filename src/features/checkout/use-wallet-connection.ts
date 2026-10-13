import { useState } from "react";
import { toast } from "sonner";
import type { Network, WalletProvider } from "@/api/contracts";
import { useConnectWallet, useDisconnectWallet } from "@/features/checkout/use-checkout";

type Selection = { walletId: string; provider: WalletProvider; network: Network };

/**
 * Conexão simulada da carteira no pagamento. Ela vale para a combinação exata
 * de carteira, provedor e rede: mudar qualquer um exige conectar de novo.
 */
export function useWalletConnection(selection: Selection) {
  const connect = useConnectWallet();
  const disconnect = useDisconnectWallet();
  const [connection, setConnection] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connected =
    connection !== null &&
    connection.walletId === selection.walletId &&
    connection.provider === selection.provider &&
    connection.network === selection.network;

  return {
    connected,
    error: connected ? null : error,
    isConnecting: connect.isPending,
    isDisconnecting: disconnect.isPending,

    connect(onConnected?: () => void) {
      setError(null);
      connect.mutate(selection, {
        onSuccess: (result) => {
          setConnection(result);
          toast.success("Carteira conectada.");
          onConnected?.();
        },
        onError: (apiError) => {
          // 401 é tratado pelo SessionWatcher
          if (apiError.isAuthError) return;
          setError(
            apiError.code === "WALLET_REJECTED"
              ? "A conexão foi recusada na carteira. Tente novamente ou escolha outra carteira."
              : apiError.message,
          );
        },
      });
    },

    disconnect() {
      disconnect.mutate(selection.walletId, {
        onSuccess: () => setConnection(null),
        onError: (apiError) => !apiError.isAuthError && toast.error(apiError.message),
      });
    },

    /** O servidor informou que a carteira não está conectada. */
    reset() {
      setConnection(null);
    },
  };
}

export type WalletConnectionState = ReturnType<typeof useWalletConnection>;
