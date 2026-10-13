import type { ConnectWalletRequest, Wallet, WalletConnection, WalletInput } from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

export async function listWallets(options?: RequestOptions) {
  const { data } = await http.get<Wallet[]>("/wallets", options);
  return data;
}

export async function createWallet(body: WalletInput) {
  const { data } = await http.post<Wallet>("/wallets", body);
  return data;
}

export async function updateWallet(walletId: string, body: WalletInput) {
  const { data } = await http.put<Wallet>(`/wallets/${encodeURIComponent(walletId)}`, body);
  return data;
}

/** Simula o pedido de conexão à carteira; pode ser recusado (403 WALLET_REJECTED). */
export async function connectWallet(walletId: string, body: ConnectWalletRequest) {
  const { data } = await http.post<WalletConnection>(
    `/wallets/${encodeURIComponent(walletId)}/connection`,
    body,
  );
  return data;
}

export async function disconnectWallet(walletId: string) {
  await http.delete(`/wallets/${encodeURIComponent(walletId)}/connection`);
}
