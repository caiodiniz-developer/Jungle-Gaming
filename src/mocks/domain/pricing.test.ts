import { beforeEach, describe, expect, it } from "vitest";
import type { Quote } from "@/api/contracts";
import { resetDb } from "@/mocks/db";
import { findNft } from "@/mocks/domain/catalog";
import { buildQuote, diffQuotes, fingerprint, getCart, mergeGuestCart, toCartView } from "@/mocks/domain/pricing";

/** Carrinho de teste com as fixtures: Sage Nomad #009 custa 1.69 ETH. */
function cartWith(quantity: number, editionId = "1-50") {
  const cart = getCart("usr_1");
  cart.lines = [{ nftId: "nft-0009", editionId, quantity }];
  return cart;
}

describe("cotação da API simulada", () => {
  // cada teste parte do banco no estado inicial das fixtures
  beforeEach(async () => {
    await resetDb();
  });

  it("soma os itens e a taxa da rede", () => {
    const quote = buildQuote(cartWith(2));
    expect(quote.subtotal).toBe("3.38");
    expect(quote.discount).toBe("0");
    expect(quote.networkFee).toBe("0.016");
    expect(quote.total).toBe("3.396");
    expect(quote.purchasable).toBe(true);
  });

  it("a taxa depende da rede escolhida", () => {
    expect(buildQuote(cartWith(1), "polygon").total).toBe("1.692");
    expect(buildQuote(cartWith(1), "solana").total).toBe("1.691");
  });

  it("cupom válido desconta o percentual do subtotal, antes da taxa", () => {
    const cart = cartWith(2);
    cart.couponCode = "KURIO10";
    const quote = buildQuote(cart);
    expect(quote.discount).toBe("0.338");
    expect(quote.total).toBe("3.058");
    expect(quote.coupon).toMatchObject({ code: "KURIO10", percent: 10 });
  });

  it("cupom expirado não dá desconto", () => {
    const cart = cartWith(1);
    cart.couponCode = "EXPIRADO";
    const quote = buildQuote(cart);
    expect(quote.coupon).toBeNull();
    expect(quote.discount).toBe("0");
  });

  it("carrinho vazio não é comprável e não cobra taxa", () => {
    const quote = buildQuote(getCart("usr_1"));
    expect(quote.purchasable).toBe(false);
    expect(quote.total).toBe("0");
  });

  it("quantidade acima do disponível marca a linha como limitada e bloqueia a compra", () => {
    const quote = buildQuote(cartWith(11));
    expect(quote.lines[0]).toMatchObject({ status: "limited", maxQuantity: 10 });
    expect(quote.purchasable).toBe(false);
  });

  it("edição esgotada fica fora do valor a pagar", () => {
    // nas fixtures, a edição 1/1 do Emerald Ape #042 está esgotada
    const cart = getCart("usr_1");
    cart.lines = [
      { nftId: "nft-0042", editionId: "1-1", quantity: 1 },
      { nftId: "nft-0009", editionId: "1-50", quantity: 1 },
    ];
    const quote = buildQuote(cart);
    expect(quote.lines[0]?.status).toBe("unavailable");
    expect(quote.subtotal).toBe("1.69");
    expect(quote.purchasable).toBe(false);
  });

  it("o hash muda quando muda o que define o valor a pagar", () => {
    const base = buildQuote(cartWith(1)).hash;
    expect(buildQuote(cartWith(1)).hash).toBe(base);
    expect(buildQuote(cartWith(2)).hash).not.toBe(base);
    expect(buildQuote(cartWith(1), "polygon").hash).not.toBe(base);

    const withCoupon = cartWith(1);
    withCoupon.couponCode = "GENESIS5";
    expect(buildQuote(withCoupon).hash).not.toBe(base);

    const nft = findNft("nft-0009");
    if (!nft) throw new Error("fixture ausente");
    nft.price = "2";
    expect(buildQuote(cartWith(1)).hash).not.toBe(base);
  });

  it("a visão do carrinho soma as quantidades", () => {
    const cart = getCart("usr_1");
    cart.lines = [
      { nftId: "nft-0009", editionId: "1-50", quantity: 2 },
      { nftId: "nft-0042", editionId: "1-50", quantity: 3 },
    ];
    const view = toCartView(cart);
    expect(view.itemCount).toBe(5);
    expect(view.lines.map((line) => line.id)).toEqual(["nft-0009:1-50", "nft-0042:1-50"]);
  });
});

describe("carrinho do visitante ao entrar", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("soma as quantidades da mesma edição e acrescenta as demais", () => {
    getCart("usr_1").lines = [{ nftId: "nft-0009", editionId: "1-50", quantity: 1 }];
    getCart("guest_abc").lines = [
      { nftId: "nft-0009", editionId: "1-50", quantity: 2 },
      { nftId: "nft-0042", editionId: "1-10", quantity: 1 },
    ];

    mergeGuestCart("guest_abc", "usr_1");

    expect(getCart("usr_1").lines).toEqual([
      { nftId: "nft-0009", editionId: "1-50", quantity: 3 },
      { nftId: "nft-0042", editionId: "1-10", quantity: 1 },
    ]);
    // o carrinho do visitante deixa de existir
    expect(getCart("guest_abc").lines).toEqual([]);
  });

  it("mantém o cupom da conta e herda o do visitante quando a conta não tem", () => {
    getCart("guest_abc").couponCode = "KURIO10";
    mergeGuestCart("guest_abc", "usr_1");
    expect(getCart("usr_1").couponCode).toBe("KURIO10");

    getCart("guest_xyz").couponCode = "GENESIS5";
    mergeGuestCart("guest_xyz", "usr_1");
    expect(getCart("usr_1").couponCode).toBe("KURIO10");
  });
});

describe("diferenças entre cotações (QUOTE_STALE)", () => {
  const line = (overrides: Partial<Quote["lines"][number]> = {}): Quote["lines"][number] => ({
    id: "nft-0009:1-50",
    nftId: "nft-0009",
    editionId: "1-50",
    editionLabel: "1/50",
    name: "Sage Nomad #009",
    tokenId: "0009",
    artwork: "sage-nomad",
    quantity: 1,
    unitPrice: "1.69",
    lineTotal: "1.69",
    maxQuantity: 10,
    status: "ok",
    nftVersion: 1,
    ...overrides,
  });
  const quote = (lines: Quote["lines"]) => ({ lines }) as Quote;

  it("aponta mudança de preço", () => {
    expect(diffQuotes(quote([line()]), quote([line({ unitPrice: "1.859" })]))).toEqual([
      { nftId: "nft-0009", name: "Sage Nomad #009", kind: "price", from: "1.69 ETH", to: "1.859 ETH" },
    ]);
  });

  it("aponta mudança de disponibilidade", () => {
    const changes = diffQuotes(quote([line()]), quote([line({ status: "unavailable", maxQuantity: 0 })]));
    expect(changes).toEqual([
      { nftId: "nft-0009", name: "Sage Nomad #009", kind: "availability", from: "10", to: "0" },
    ]);
  });

  it("aponta item que saiu do catálogo", () => {
    expect(diffQuotes(quote([line()]), quote([]))[0]).toMatchObject({ kind: "removed" });
  });

  it("sem a cotação revisada, não há o que comparar", () => {
    expect(diffQuotes(undefined, quote([line()]))).toEqual([]);
  });
});

describe("impressão digital", () => {
  it("é determinística e sensível ao conteúdo", () => {
    expect(fingerprint({ a: 1 })).toBe(fingerprint({ a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
    expect(fingerprint("x")).toMatch(/^[0-9a-f]{8}$/);
  });
});
