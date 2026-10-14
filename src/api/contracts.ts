/**
 * Contratos REST e de eventos compartilhados entre o cliente (Axios, TanStack Query,
 * Socket.IO) e a camada de mocks (MSW). Uma única fonte de tipos evita que a
 * simulação e a interface divirjam.
 */
import type { EthAmount } from "@/lib/eth";

// ───────────────────────────── Erros ─────────────────────────────

export type ApiErrorCode =
  | "VALIDATION_ERROR" // 422 — campos inválidos (ver `fields`)
  | "INVALID_CREDENTIALS" // 401 — e-mail ou senha incorretos
  | "UNAUTHENTICATED" // 401 — sem sessão
  | "SESSION_EXPIRED" // 401 — sessão expirou
  | "FORBIDDEN" // 403 — recurso de outro usuário
  | "WALLET_REJECTED" // 403 — conexão recusada na carteira
  | "NOT_FOUND" // 404
  | "EMAIL_TAKEN" // 409 — conflito de cadastro
  | "USERNAME_TAKEN" // 409 — conflito de cadastro
  | "AVAILABILITY_CONFLICT" // 409 — edição esgotada ou quantidade acima do disponível
  | "QUOTE_STALE" // 409 — cotação desatualizada (ver `details`)
  | "IDEMPOTENCY_CONFLICT" // 409 — mesma chave com conteúdo diferente
  | "ORDER_PENDING" // 409 — já existe um pedido aguardando confirmação (ver `details`)
  | "COUPON_INVALID" // 422
  | "COUPON_EXPIRED" // 422
  | "SERVICE_UNAVAILABLE" // 503 — falha transitória
  | "INTERNAL_ERROR"; // 500

/** Corpo de toda resposta de erro (4xx/5xx). */
export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  /** Mensagem por campo, em erros de validação e conflito. */
  fields?: Record<string, string>;
  /** Dados extras para recuperação (ex.: nova cotação em QUOTE_STALE). */
  details?: unknown;
};

// ───────────────────────────── Catálogo ─────────────────────────────

export type Network = "ethereum" | "polygon" | "solana";
export type WalletProvider = "metamask" | "walletconnect" | "coinbase";

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  solana: "Solana",
};

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  coinbase: "Coinbase Wallet",
};

/** Identificador da arte (arquivos em /public/nfts/<artwork>-<largura>.webp). */
export type Artwork = "emerald-ape" | "sage-nomad" | "ivory-baron" | "golden-beat";

export type NftEdition = {
  id: string;
  /** Rótulo exibido: "1/1", "1/10", "1/50" ou "ABERTA". */
  label: string;
  /** Unidades disponíveis para compra agora. */
  available: number;
  /** Limite por pedido (≤ available). */
  maxPerOrder: number;
};

export type NftSummary = {
  id: string;
  /** Número do token com zeros à esquerda, ex.: "0042". */
  tokenId: string;
  name: string;
  artwork: Artwork;
  price: EthAmount;
  /** Preço anterior, quando o item está em promoção. */
  previousPrice: EthAmount | null;
  category: { id: string; name: string };
  network: Network;
  rare: boolean;
  /** Há ao menos uma edição com unidades disponíveis. */
  available: boolean;
  /** Edição usada ao comprar direto do catálogo; null quando tudo está esgotado. */
  defaultEditionId: string | null;
  listedAt: string;
  /** Versão do recurso; cresce a cada alteração e ordena os eventos em tempo real. */
  version: number;
};

export type NftDetail = NftSummary & {
  collection: string;
  creator: string;
  summary: string;
  description: string[];
  attributes: string[];
  contract: string;
  royaltyPercent: number;
  rating: { average: number; count: number };
  editions: NftEdition[];
  /** NFTs da mesma coleção, para o carrossel "Mais desta coleção". */
  related: NftSummary[];
};

export type NftTab = "todos" | "novos" | "em-alta";
export type NftSort = "recentes" | "preco-asc" | "preco-desc" | "nome";

export type NftListParams = {
  q?: string;
  categories?: string[];
  networks?: Network[];
  minPrice?: EthAmount;
  maxPrice?: EthAmount;
  tab?: NftTab;
  sort?: NftSort;
  page?: number;
  pageSize?: number;
};

export type Facet<Id extends string = string> = { id: Id; name: string; count: number };

export type NftListResponse = {
  items: NftSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  facets: {
    categories: Facet[];
    networks: Facet<Network>[];
    priceRange: { min: EthAmount; max: EthAmount };
  };
};

// ───────────────────────────── Sessão e conta ─────────────────────────────

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  ensName: string;
  walletAlias: string;
  /** Imagem do avatar como data URL, ou null. */
  avatarUrl: string | null;
};

export type Session = {
  token: string;
  expiresAt: string;
  user: User;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  /** Carrinho do visitante a ser incorporado à conta. */
  guestCartId?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
  guestCartId?: string;
};

export type UpdateProfileRequest = {
  displayName: string;
  username: string;
  email: string;
  ensName: string;
  walletAlias: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateAvatarRequest = {
  /** Data URL da imagem (PNG, JPEG ou WebP). */
  dataUrl: string;
};

// ───────────────────────────── Carteiras ─────────────────────────────

export type WalletKind = "primary" | "secondary";

export type WalletInput = {
  kind: WalletKind;
  displayName: string;
  alias: string;
  network: Network;
  profileName: string;
  address: string;
  secondaryAddress: string;
  provider: WalletProvider;
  referralCode: string;
  email: string;
  ensName: string;
};

export type Wallet = WalletInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletConnection = {
  walletId: string;
  provider: WalletProvider;
  network: Network;
  connectedAt: string;
};

export type ConnectWalletRequest = {
  provider: WalletProvider;
  network: Network;
};

// ───────────────────────────── Favoritos ─────────────────────────────

export type FavoritesResponse = {
  nftIds: string[];
};

// ───────────────────────────── Carrinho e cotação ─────────────────────────────

export type CartLineStatus = "ok" | "limited" | "unavailable";

export type CartLine = {
  /** `${nftId}:${editionId}` — uma linha por NFT e edição. */
  id: string;
  nftId: string;
  editionId: string;
  editionLabel: string;
  name: string;
  tokenId: string;
  artwork: Artwork;
  quantity: number;
  unitPrice: EthAmount;
  lineTotal: EthAmount;
  /** Quantidade máxima que pode ser comprada agora. */
  maxQuantity: number;
  /** "limited": pedido acima do disponível; "unavailable": edição esgotada. */
  status: CartLineStatus;
  nftVersion: number;
};

export type Cart = {
  id: string;
  lines: CartLine[];
  /** Soma das quantidades (badge do header). */
  itemCount: number;
  couponCode: string | null;
  updatedAt: string;
};

export type AddCartItemRequest = {
  nftId: string;
  editionId: string;
  quantity: number;
};

export type UpdateCartItemRequest = {
  quantity: number;
};

export type ApplyCouponRequest = {
  code: string;
};

export type QuoteRequest = {
  /** Rede usada para estimar a taxa; padrão: ethereum. */
  network?: Network;
};

export type QuoteCoupon = {
  code: string;
  description: string;
  percent: number;
};

export type Quote = {
  /** Impressão digital do conteúdo cotado; muda se preço, quantidade, cupom ou taxa mudarem. */
  hash: string;
  network: Network;
  lines: CartLine[];
  subtotal: EthAmount;
  discount: EthAmount;
  networkFee: EthAmount;
  total: EthAmount;
  coupon: QuoteCoupon | null;
  /** false quando há linha esgotada ou acima do disponível. */
  purchasable: boolean;
  createdAt: string;
};

export type QuoteChange = {
  nftId: string;
  name: string;
  kind: "price" | "availability" | "removed";
  from: string;
  to: string;
};

/** `details` do erro QUOTE_STALE. */
export type QuoteStaleDetails = {
  quote: Quote;
  changes: QuoteChange[];
};

/** `details` do erro ORDER_PENDING: o pedido que ainda aguarda confirmação. */
export type OrderPendingDetails = {
  orderId: string;
};

// ───────────────────────────── Pedidos ─────────────────────────────

export type OrderStatus = "pending" | "confirmed" | "rejected";

export type CollectorInfo = {
  displayName: string;
  username: string;
  profileName: string;
  email: string;
  referralCode: string;
  ensName: string;
  note: string;
};

export type CreateOrderRequest = {
  /** Hash da cotação revisada pelo usuário. */
  quoteHash: string;
  walletId: string;
  provider: WalletProvider;
  network: Network;
  collector: CollectorInfo;
};

export type OrderLine = {
  nftId: string;
  editionId: string;
  editionLabel: string;
  name: string;
  tokenId: string;
  artwork: Artwork;
  quantity: number;
  unitPrice: EthAmount;
  lineTotal: EthAmount;
};

/** Snapshot imutável do pedido: mudanças posteriores no catálogo não o alteram. */
export type Order = {
  id: string;
  status: OrderStatus;
  /** Cresce a cada mudança de estado; ordena os eventos order.updated. */
  version: number;
  lines: OrderLine[];
  subtotal: EthAmount;
  discount: EthAmount;
  networkFee: EthAmount;
  total: EthAmount;
  coupon: QuoteCoupon | null;
  network: Network;
  wallet: { label: string; address: string; provider: WalletProvider };
  collector: CollectorInfo;
  /** Preenchido quando confirmado. Hash e link são simulados. */
  transaction: { hash: string; explorerUrl: string } | null;
  /** Preenchido quando recusado. */
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderListResponse = {
  items: Order[];
};

// ───────────────────────────── Eventos em tempo real ─────────────────────────────

export type RealtimeEventType = "nft.updated" | "order.updated";

/**
 * Envelope de todo evento Socket.IO.
 * `id` identifica o evento (duplicatas são descartadas) e `version` é a versão
 * do recurso após o evento (eventos antigos são descartados).
 */
export type RealtimeEnvelope<Type extends RealtimeEventType, Data> = {
  id: string;
  type: Type;
  resource: { type: "nft" | "order"; id: string };
  version: number;
  occurredAt: string;
  /** Dono do recurso em eventos privados; ausente em eventos públicos. */
  userId?: string;
  data: Data;
};

export type NftUpdatedData = {
  nft: NftSummary;
  editions: NftEdition[];
};

export type NftUpdatedEvent = RealtimeEnvelope<"nft.updated", NftUpdatedData>;
export type OrderUpdatedEvent = RealtimeEnvelope<"order.updated", { order: Order }>;

/** Eventos emitidos pelo servidor. */
export type ServerToClientEvents = {
  "nft.updated": (event: NftUpdatedEvent) => void;
  "order.updated": (event: OrderUpdatedEvent) => void;
};

/** Eventos emitidos pelo cliente. */
export type ClientToServerEvents = {
  /** Associa a conexão à sessão para receber eventos privados. */
  "session.join": (payload: { token: string }) => void;
  "session.leave": () => void;
};
