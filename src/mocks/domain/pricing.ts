import type {
  Cart,
  CartLine,
  Network,
  Quote,
  QuoteChange,
  QuoteCoupon,
} from "@/api/contracts";
import { addEth, formatEthLabel, multiplyEth, percentOfEth, subtractEth } from "@/lib/eth";
import { findNft } from "@/mocks/domain/catalog";
import { commit, db } from "@/mocks/db";
import type { DbCart } from "@/mocks/types";

type CouponDefinition = QuoteCoupon & { expired: boolean };

/** Cupons da demonstração (documentados no README). */
export const COUPONS: Record<string, CouponDefinition> = {
  KURIO10: { code: "KURIO10", description: "Desconto do lançamento", percent: 10, expired: false },
  GENESIS5: { code: "GENESIS5", description: "Desconto gênesis", percent: 5, expired: false },
  EXPIRADO: { code: "EXPIRADO", description: "Campanha encerrada", percent: 15, expired: true },
};

/** Taxa de rede estimada por rede, em ETH. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: "0.016",
  polygon: "0.002",
  solana: "0.001",
};

// carrinho do dono (cria se não existir)
export function getCart(ownerKey: string): DbCart {
  const carts = db().carts;
  carts[ownerKey] ??= {
    id: `cart_${ownerKey}`,
    lines: [],
    couponCode: null,
    updatedAt: new Date().toISOString(),
  };
  return carts[ownerKey];
}

// marca o carrinho como alterado e grava
export function touchCart(cart: DbCart) {
  cart.updatedAt = new Date().toISOString();
  commit();
}

/** Monta as linhas com preço e disponibilidade atuais; itens removidos do catálogo somem. */
function buildLines(cart: DbCart): CartLine[] {
  const lines: CartLine[] = [];
  for (const line of cart.lines) {
    const nft = findNft(line.nftId);
    const edition = nft?.editions.find((item) => item.id === line.editionId);
    if (!nft || !edition) continue;

    const maxQuantity = Math.min(edition.available, edition.maxPerOrder);
    lines.push({
      id: `${line.nftId}:${line.editionId}`,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      name: nft.name,
      tokenId: nft.tokenId,
      artwork: nft.artwork,
      quantity: line.quantity,
      unitPrice: nft.price,
      lineTotal: multiplyEth(nft.price, line.quantity),
      maxQuantity,
      status: maxQuantity === 0 ? "unavailable" : line.quantity > maxQuantity ? "limited" : "ok",
      nftVersion: nft.version,
    });
  }
  return lines;
}

// carrinho do banco → carrinho da API
export function toCartView(cart: DbCart): Cart {
  const lines = buildLines(cart);
  return {
    id: cart.id,
    lines,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    couponCode: cart.couponCode,
    updatedAt: cart.updatedAt,
  };
}

/** Hash FNV-1a de 32 bits em hexadecimal: curto, determinístico e suficiente para detectar mudanças. */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Cotação do carrinho. O `hash` cobre tudo que define o valor a pagar: uma
 * mudança de preço, quantidade, disponibilidade, cupom ou rede produz outro hash,
 * e é por ele que o pedido prova que o usuário revisou os valores atuais.
 */
export function buildQuote(cart: DbCart, network: Network = "ethereum"): Quote {
  const lines = buildLines(cart);
  // linhas esgotadas não entram no valor: não podem ser compradas
  const payable = lines.filter((line) => line.status !== "unavailable");
  const subtotal = addEth("0", ...payable.map((line) => line.lineTotal));

  const definition = cart.couponCode ? COUPONS[cart.couponCode] : undefined;
  const coupon: QuoteCoupon | null =
    definition && !definition.expired
      ? { code: definition.code, description: definition.description, percent: definition.percent }
      : null;

  const discount = coupon ? percentOfEth(subtotal, coupon.percent) : "0";
  const networkFee = payable.length > 0 ? NETWORK_FEES[network] : "0";
  const total = addEth(subtractEth(subtotal, discount), networkFee);

  const hash = fingerprint({
    network,
    coupon: coupon?.code ?? null,
    networkFee,
    lines: lines.map((line) => [line.id, line.quantity, line.unitPrice, line.status]),
  });

  const quote: Quote = {
    hash,
    network,
    lines,
    subtotal,
    discount,
    networkFee,
    total,
    coupon,
    purchasable: lines.length > 0 && lines.every((line) => line.status === "ok"),
    createdAt: new Date().toISOString(),
  };

  rememberQuote(quote);
  return quote;
}

// guarda a cotação para comparar depois
function rememberQuote(quote: Quote) {
  const quotes = db().quotes;
  quotes[quote.hash] = quote;
  const hashes = Object.keys(quotes);
  // mantém só as mais recentes
  for (const stale of hashes.slice(0, Math.max(0, hashes.length - 30))) delete quotes[stale];
  commit();
}

/** Diferenças entre a cotação que o usuário revisou e a atual, para explicar um QUOTE_STALE. */
export function diffQuotes(previous: Quote | undefined, current: Quote): QuoteChange[] {
  if (!previous) return [];
  const changes: QuoteChange[] = [];

  for (const before of previous.lines) {
    const after = current.lines.find((line) => line.id === before.id);
    if (!after) {
      changes.push({
        nftId: before.nftId,
        name: before.name,
        kind: "removed",
        from: `${before.quantity}`,
        to: "0",
      });
      continue;
    }
    if (after.unitPrice !== before.unitPrice) {
      changes.push({
        nftId: after.nftId,
        name: after.name,
        kind: "price",
        from: formatEthLabel(before.unitPrice),
        to: formatEthLabel(after.unitPrice),
      });
    }
    if (after.status !== before.status || after.maxQuantity !== before.maxQuantity) {
      changes.push({
        nftId: after.nftId,
        name: after.name,
        kind: "availability",
        from: `${before.maxQuantity}`,
        to: `${after.maxQuantity}`,
      });
    }
  }
  return changes;
}

/**
 * Incorpora o carrinho do visitante ao da conta ao autenticar: soma as
 * quantidades por NFT e edição e mantém o cupom da conta, se houver.
 */
export function mergeGuestCart(guestKey: string | undefined, userId: string) {
  if (!guestKey || guestKey === userId) return;
  const carts = db().carts;
  const guest = carts[guestKey];
  if (!guest) return;

  const target = getCart(userId);
  for (const line of guest.lines) {
    const existing = target.lines.find(
      (item) => item.nftId === line.nftId && item.editionId === line.editionId,
    );
    if (existing) existing.quantity += line.quantity;
    else target.lines.push({ ...line });
  }
  target.couponCode ??= guest.couponCode;
  delete carts[guestKey];
  touchCart(target);
}
