import type { CreateOrderRequest, Order, OrderLine } from "@/api/contracts";
import { WALLET_PROVIDER_LABELS } from "@/api/contracts";
import { addEth, percentOfEth } from "@/lib/eth";
import { getConfig } from "@/mocks/config";
import { findNft } from "@/mocks/domain/catalog";
import { buildQuote, diffQuotes, fingerprint, getCart, touchCart } from "@/mocks/domain/pricing";
import { commit, db, nextId } from "@/mocks/db";
import { fail } from "@/mocks/http";
import { emitNftUpdated, emitOrderUpdated } from "@/mocks/realtime";
import type { DbNft, DbOrder, DbUser } from "@/mocks/types";

// temporizadores de resolução dos pedidos
const timers = new Map<string, number>();

// pedido sem os campos internos
export function toPublicOrder(order: DbOrder): Order {
  // remove os campos internos do banco simulado
  const copy: Partial<DbOrder> = structuredClone(order);
  delete copy.userId;
  delete copy.idempotencyKey;
  delete copy.fingerprint;
  delete copy.resolveAt;
  delete copy.outcome;
  return copy as Order;
}

// sobe a versão do NFT e emite o evento
function bumpNft(nft: DbNft) {
  nft.version += 1;
  for (const edition of nft.editions) edition.maxPerOrder = Math.min(edition.available, 10);
  commit();
  emitNftUpdated(nft);
}

/** Altera preço ou disponibilidade de um NFT e propaga o evento nft.updated. */
export function updateNft(
  nftId: string,
  change: { price?: string; previousPrice?: string | null; editions?: Record<string, number> },
): DbNft | null {
  const nft = findNft(nftId);
  if (!nft) return null;
  if (change.price !== undefined) nft.price = change.price;
  if (change.previousPrice !== undefined) nft.previousPrice = change.previousPrice;
  for (const [editionId, available] of Object.entries(change.editions ?? {})) {
    const edition = nft.editions.find((item) => item.id === editionId);
    if (edition) edition.available = Math.max(0, Math.trunc(available));
  }
  bumpNft(nft);
  return nft;
}

/** Cenários "preço alterado" e "edição esgotada": muda o primeiro item no instante do envio, uma única vez. */
function applySubmitScenario(userId: string) {
  const current = db();
  const mode = getConfig().onOrderSubmit;
  if (mode === "none" || current.submitChangeApplied) return;

  const line = getCart(userId).lines[0];
  const nft = line && findNft(line.nftId);
  if (!line || !nft) return;

  current.submitChangeApplied = true;
  if (mode === "price-change") {
    updateNft(nft.id, { price: addEth(nft.price, percentOfEth(nft.price, 10)) });
  } else {
    updateNft(nft.id, { editions: { [line.editionId]: 0 } });
  }
}

// cria o pedido (idempotente)
export function createOrder(
  user: DbUser,
  body: CreateOrderRequest,
  idempotencyKey: string,
): { order: DbOrder; replayed: boolean } {
  const current = db();
  const requestFingerprint = fingerprint(body);

  // idempotência: a mesma tentativa recupera o mesmo pedido, sem criar outro
  const existing = current.orders.find(
    (order) => order.userId === user.id && order.idempotencyKey === idempotencyKey,
  );
  if (existing) {
    if (existing.fingerprint !== requestFingerprint) {
      fail(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Esta chave de idempotência já foi usada com outro conteúdo.",
      );
    }
    return { order: existing, replayed: true };
  }

  applySubmitScenario(user.id);

  const cart = getCart(user.id);
  const reviewed = current.quotes[body.quoteHash];
  const quote = buildQuote(cart, body.network);

  if (quote.lines.length === 0) {
    fail(422, "VALIDATION_ERROR", "Seu carrinho está vazio.");
  }
  if (quote.hash !== body.quoteHash) {
    fail(409, "QUOTE_STALE", "Os valores mudaram desde a sua revisão. Confira o novo resumo.", {
      details: { quote, changes: diffQuotes(reviewed, quote) },
    });
  }
  if (!quote.purchasable) {
    fail(409, "AVAILABILITY_CONFLICT", "Há itens indisponíveis no carrinho.", {
      details: { quote, changes: [] },
    });
  }

  const wallet = current.wallets[user.id]?.find((item) => item.id === body.walletId);
  if (!wallet) {
    fail(422, "VALIDATION_ERROR", "Selecione uma carteira cadastrada.", {
      fields: { walletId: "Selecione uma carteira cadastrada." },
    });
  }
  if (current.walletConnections[user.id]?.walletId !== wallet.id) {
    fail(403, "WALLET_REJECTED", "Conecte a carteira antes de confirmar a compra.");
  }

  const { order: orderConfig } = getConfig();
  const now = new Date();
  const lines: OrderLine[] = quote.lines.map((line) => ({
    nftId: line.nftId,
    editionId: line.editionId,
    editionLabel: line.editionLabel,
    name: line.name,
    tokenId: line.tokenId,
    artwork: line.artwork,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));

  const order: DbOrder = {
    id: nextId("order", "ord"),
    status: "pending",
    version: 1,
    lines,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    coupon: quote.coupon,
    network: body.network,
    wallet: {
      label: `${wallet.alias} · ${WALLET_PROVIDER_LABELS[body.provider]}`,
      address: wallet.address,
      provider: body.provider,
    },
    collector: body.collector,
    transaction: null,
    rejectionReason: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    userId: user.id,
    idempotencyKey,
    fingerprint: requestFingerprint,
    outcome: orderConfig.outcome,
    resolveAt: orderConfig.outcome === "hold" ? null : now.getTime() + orderConfig.delayMs,
  };

  current.orders.push(order);
  commit();
  scheduleResolution(order);
  return { order, replayed: false };
}

// agenda a confirmação ou recusa
function scheduleResolution(order: DbOrder) {
  if (order.status !== "pending" || order.resolveAt === null || timers.has(order.id)) return;
  const wait = Math.max(0, order.resolveAt - Date.now());
  const timer = window.setTimeout(() => {
    timers.delete(order.id);
    resolveOrder(order.id, order.outcome === "reject" ? "rejected" : "confirmed");
  }, wait);
  timers.set(order.id, timer);
}

/** Reagenda os pedidos que estavam pendentes quando a página foi recarregada. */
export function resumePendingOrders() {
  for (const order of db().orders) scheduleResolution(order);
}

// cancela os temporizadores
export function cancelOrderTimers() {
  for (const timer of timers.values()) window.clearTimeout(timer);
  timers.clear();
}

/** Hash de transação simulado, derivado do id do pedido (estável entre execuções). */
function simulatedTransactionHash(orderId: string): string {
  const parts = Array.from({ length: 8 }, (_, index) => fingerprint(`${orderId}:${index}`));
  return `0x${parts.join("").toUpperCase()}`;
}

/**
 * Conclui um pedido pendente. Confirmado e recusado são estados terminais:
 * chamar de novo não muda nada.
 */
export function resolveOrder(
  orderId: string,
  status: "confirmed" | "rejected",
  reason?: string,
): DbOrder | null {
  const current = db();
  const order = current.orders.find((item) => item.id === orderId);
  if (!order || order.status !== "pending") return order ?? null;

  const pendingTimer = timers.get(order.id);
  if (pendingTimer !== undefined) {
    window.clearTimeout(pendingTimer);
    timers.delete(order.id);
  }

  let finalStatus = status;
  let rejectionReason = reason ?? getConfig().order.rejectionReason;

  if (finalStatus === "confirmed") {
    // o estoque é baixado só aqui; se esgotou enquanto o pedido estava pendente, a compra é recusada
    const insufficient = order.lines.some((line) => {
      const edition = findNft(line.nftId)?.editions.find((item) => item.id === line.editionId);
      return !edition || edition.available < line.quantity;
    });
    if (insufficient) {
      finalStatus = "rejected";
      rejectionReason = "Uma das edições esgotou antes da confirmação.";
    }
  }

  if (finalStatus === "confirmed") {
    const cart = getCart(order.userId);
    for (const line of order.lines) {
      const nft = findNft(line.nftId);
      const edition = nft?.editions.find((item) => item.id === line.editionId);
      if (nft && edition) {
        edition.available -= line.quantity;
        bumpNft(nft);
      }
      // remove do carrinho apenas o que foi comprado
      const cartLine = cart.lines.find(
        (item) => item.nftId === line.nftId && item.editionId === line.editionId,
      );
      if (cartLine) cartLine.quantity -= line.quantity;
    }
    cart.lines = cart.lines.filter((item) => item.quantity > 0);
    if (cart.lines.length === 0) cart.couponCode = null;
    touchCart(cart);

    const hash = simulatedTransactionHash(order.id);
    order.transaction = { hash, explorerUrl: `https://etherscan.io/tx/${hash}` };
  } else {
    order.rejectionReason = rejectionReason;
  }

  order.status = finalStatus;
  order.version += 1;
  order.resolveAt = null;
  order.updatedAt = new Date().toISOString();
  commit();
  emitOrderUpdated(order, toPublicOrder(order));
  return order;
}
