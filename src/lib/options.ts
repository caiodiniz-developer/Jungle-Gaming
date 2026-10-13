import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Network, type WalletProvider } from "@/api/contracts";

/** Opções dos selects de rede e de tipo de carteira (carteiras e pagamento). */
export const NETWORK_OPTIONS = (Object.keys(NETWORK_LABELS) as Network[]).map((value) => ({
  value,
  label: NETWORK_LABELS[value],
}));

export const WALLET_PROVIDERS = Object.keys(WALLET_PROVIDER_LABELS) as WalletProvider[];

export const PROVIDER_OPTIONS = WALLET_PROVIDERS.map((value) => ({
  value,
  label: WALLET_PROVIDER_LABELS[value],
}));
