import type { Network, Wallet, WalletProvider } from "@/api/contracts";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from "@/api/contracts";
import walletIcon from "@/assets/icons/wallet.svg";
import { Icon } from "@/components/icon";
import { RadioCard } from "@/components/radio-card";
import { Button } from "@/components/ui/button";
import type { WalletConnectionState } from "@/features/checkout/use-wallet-connection";
import { cn } from "@/lib/utils";

/** Ordem do layout. */
const ORDER: WalletProvider[] = ["walletconnect", "metamask", "coinbase"];

type ProviderOptionsProps = {
  value: WalletProvider;
  onChange: (provider: WalletProvider) => void;
  /** Mobile: cartões altos com medalhão e rádio à direita; desktop: linhas com rádio à esquerda. */
  compact: boolean;
};

/** "Carteira e rede": escolha do provedor da carteira. */
export function ProviderOptions({ value, onChange, compact }: ProviderOptionsProps) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend
        className={cn(
          "mb-4 w-full leading-6 font-bold",
          compact ? "text-base" : "text-center text-[17px]",
        )}
      >
        Carteira e rede
      </legend>
      {ORDER.map((provider) => {
        const label = WALLET_PROVIDER_LABELS[provider];
        return (
          <RadioCard
            key={provider}
            name="provider"
            value={provider}
            checked={provider === value}
            onChange={() => onChange(provider)}
            indicator={compact ? "end" : "start"}
            className={
              compact
                ? "h-[65px] rounded-[15px] border-transparent bg-surface px-3.5 shadow-glow-lg"
                : "h-[45px] rounded-sm"
            }
          >
            {compact && (
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-soft bg-surface-raised text-sm font-bold text-highlight"
              >
                {provider === "coinbase" ? <Icon src={walletIcon} className="size-5" /> : label.charAt(0)}
              </span>
            )}
            <span className="text-[15px]">{label}</span>
          </RadioCard>
        );
      })}
    </fieldset>
  );
}

type ConnectionRowProps = {
  connection: WalletConnectionState;
  wallet: Wallet | undefined;
  provider: WalletProvider;
  network: Network;
  /** A rede do formulário é válida (o select permite voltar a "Selecione uma rede"). */
  canConnect: boolean;
  onConnected: () => void;
};

/** Estado da conexão simulada: conectar, ver o que está conectado e desconectar. */
export function ConnectionRow({ connection, wallet, provider, network, canConnect, onConnected }: ConnectionRowProps) {
  return (
    <div className="flex flex-col gap-2">
      {connection.connected && wallet ? (
        <p role="status" className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm leading-5 text-sand">
          <span>
            <span className="font-bold text-foreground">Carteira conectada:</span> {wallet.alias} ·{" "}
            {WALLET_PROVIDER_LABELS[provider]} · {NETWORK_LABELS[network]}
          </span>
          <button
            type="button"
            disabled={connection.isDisconnecting}
            onClick={connection.disconnect}
            className="font-bold text-highlight underline underline-offset-2 disabled:opacity-50"
          >
            Desconectar
          </button>
        </p>
      ) : (
        <Button
          id="conectar-carteira"
          variant="outline"
          onClick={() => connection.connect(onConnected)}
          disabled={!wallet || !canConnect || connection.isConnecting}
          className="w-full rounded-sm"
        >
          {connection.isConnecting ? "Aguardando a carteira…" : "Conectar carteira"}
        </Button>
      )}
      {connection.error && (
        <p role="alert" className="text-xs leading-4 text-coral">
          <span className="sr-only">Erro: </span>
          {connection.error}
        </p>
      )}
    </div>
  );
}
