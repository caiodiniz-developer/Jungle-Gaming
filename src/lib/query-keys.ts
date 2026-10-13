import type { Network, NftListParams } from "@/api/contracts";

/**
 * Chaves de cache do TanStack Query.
 * Dados privados levam o identificador da sessão na chave: ao trocar de usuário
 * as consultas mudam de chave e nenhum dado da sessão anterior é reaproveitado.
 */
export const queryKeys = {
  nfts: {
    all: ["nfts"] as const,
    lists: () => ["nfts", "list"] as const,
    list: (params: NftListParams) => ["nfts", "list", params] as const,
    details: () => ["nfts", "detail"] as const,
    detail: (nftId: string) => ["nfts", "detail", nftId] as const,
  },
  session: (sessionKey: string) => ["session", sessionKey] as const,
  favorites: (sessionKey: string) => ["favorites", sessionKey] as const,
  wallets: (sessionKey: string) => ["wallets", sessionKey] as const,
  cart: (sessionKey: string) => ["cart", sessionKey] as const,
  quotes: (sessionKey: string) => ["quote", sessionKey] as const,
  quote: (sessionKey: string, network: Network) => ["quote", sessionKey, network] as const,
  orders: (sessionKey: string) => ["orders", sessionKey, "list"] as const,
  order: (sessionKey: string, orderId: string) => ["orders", sessionKey, orderId] as const,
};

/** Identificador usado nas chaves de quem ainda não entrou. */
export const GUEST_SESSION_KEY = "visitante";

/** Prefixos das consultas com dados do usuário, removidas do cache ao sair ou trocar de conta. */
export const PRIVATE_QUERY_PREFIXES = ["session", "favorites", "wallets", "cart", "quote", "orders"] as const;
