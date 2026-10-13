import type {
  NftDetail,
  Order,
  Quote,
  User,
  Wallet,
  WalletConnection,
} from "@/api/contracts";
import type { OrderOutcome } from "@/mocks/config";

/** NFT como guardado no banco simulado; disponibilidade, edição padrão e relacionados são derivados na resposta. */
export type DbNft = Omit<NftDetail, "related" | "available" | "defaultEditionId"> & {
  trending: boolean;
  isNew: boolean;
};

/** A senha nunca é guardada: só o hash SHA-256 com salt. */
export type DbUser = User & {
  passwordHash: string;
  passwordSalt: string;
};

export type DbSession = {
  token: string;
  userId: string;
  expiresAt: number;
};

export type DbCartLine = {
  nftId: string;
  editionId: string;
  quantity: number;
};

export type DbCart = {
  id: string;
  lines: DbCartLine[];
  couponCode: string | null;
  updatedAt: string;
};

export type DbOrder = Order & {
  userId: string;
  idempotencyKey: string;
  /** Impressão digital do corpo da requisição que criou o pedido. */
  fingerprint: string;
  /** Instante (epoch ms) em que o pedido pendente deve ser resolvido; null = aguarda resolução manual. */
  resolveAt: number | null;
  outcome: OrderOutcome;
};

export type Db = {
  schemaVersion: number;
  nfts: DbNft[];
  users: DbUser[];
  sessions: DbSession[];
  /** Chave: id do usuário ou id do carrinho de visitante. */
  carts: Record<string, DbCart>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  walletConnections: Record<string, WalletConnection>;
  orders: DbOrder[];
  /** Cotações emitidas recentemente, por hash, para explicar o que mudou em QUOTE_STALE. */
  quotes: Record<string, Quote>;
  counters: { user: number; wallet: number; order: number; event: number };
  /** A alteração do cenário "preço alterado"/"edição esgotada" já foi aplicada. */
  submitChangeApplied: boolean;
};
