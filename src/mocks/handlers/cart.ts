import { z } from "zod";
import { addCartItemSchema, couponSchema, updateCartItemSchema } from "@/api/schemas";
import { findNft } from "@/mocks/domain/catalog";
import { buildQuote, COUPONS, getCart, toCartView, touchCart } from "@/mocks/domain/pricing";
import { cartOwner, fail, json, readBody, route } from "@/mocks/http";

const quoteSchema = z.object({
  network: z.enum(["ethereum", "polygon", "solana"]).optional(),
});

/** Quantidade máxima comprável de uma edição; lança 404/409 quando não é possível comprar. */
function purchasableLimit(nftId: string, editionId: string): number {
  const nft = findNft(nftId);
  const edition = nft?.editions.find((item) => item.id === editionId);
  if (!nft || !edition) fail(404, "NOT_FOUND", "NFT ou edição não encontrados.");

  const limit = Math.min(edition.available, edition.maxPerOrder);
  if (limit === 0) {
    fail(409, "AVAILABILITY_CONFLICT", `A edição ${edition.label} de ${nft.name} está esgotada.`, {
      details: { maxQuantity: 0 },
    });
  }
  return limit;
}

function assertWithinLimit(quantity: number, limit: number) {
  if (quantity > limit) {
    fail(
      409,
      "AVAILABILITY_CONFLICT",
      limit === 1
        ? "Só há 1 unidade disponível desta edição."
        : `Só há ${limit} unidades disponíveis desta edição.`,
      { details: { maxQuantity: limit } },
    );
  }
}

function splitLineId(lineId: string): { nftId: string; editionId: string } {
  const [nftId = "", editionId = ""] = decodeURIComponent(lineId).split(":");
  return { nftId, editionId };
}

export const cartHandlers = [
  route("get", "/cart", ({ request }) => json(toCartView(getCart(cartOwner(request).key)))),

  route("post", "/cart/items", async ({ request }) => {
    const owner = cartOwner(request);
    const body = await readBody(request, addCartItemSchema);
    const limit = purchasableLimit(body.nftId, body.editionId);

    const cart = getCart(owner.key);
    const existing = cart.lines.find(
      (line) => line.nftId === body.nftId && line.editionId === body.editionId,
    );
    assertWithinLimit((existing?.quantity ?? 0) + body.quantity, limit);

    if (existing) existing.quantity += body.quantity;
    else cart.lines.push({ nftId: body.nftId, editionId: body.editionId, quantity: body.quantity });
    touchCart(cart);
    return json(toCartView(cart), 201);
  }),

  route("patch", "/cart/items/:lineId", async ({ request, params }) => {
    const owner = cartOwner(request);
    const body = await readBody(request, updateCartItemSchema);
    const { nftId, editionId } = splitLineId(params.lineId ?? "");

    const cart = getCart(owner.key);
    const line = cart.lines.find((item) => item.nftId === nftId && item.editionId === editionId);
    if (!line) fail(404, "NOT_FOUND", "Item não encontrado no carrinho.");

    assertWithinLimit(body.quantity, purchasableLimit(nftId, editionId));
    line.quantity = body.quantity;
    touchCart(cart);
    return json(toCartView(cart));
  }),

  route("delete", "/cart/items/:lineId", ({ request, params }) => {
    const owner = cartOwner(request);
    const { nftId, editionId } = splitLineId(params.lineId ?? "");
    const cart = getCart(owner.key);
    cart.lines = cart.lines.filter(
      (item) => !(item.nftId === nftId && item.editionId === editionId),
    );
    if (cart.lines.length === 0) cart.couponCode = null;
    touchCart(cart);
    return json(toCartView(cart));
  }),

  route("put", "/cart/coupon", async ({ request }) => {
    const owner = cartOwner(request);
    const { code } = await readBody(request, couponSchema);
    const coupon = COUPONS[code];

    if (!coupon) {
      fail(422, "COUPON_INVALID", "Código promocional inválido.", {
        fields: { code: "Código promocional inválido." },
      });
    }
    if (coupon.expired) {
      fail(422, "COUPON_EXPIRED", "Este código promocional expirou.", {
        fields: { code: "Este código promocional expirou." },
      });
    }

    const cart = getCart(owner.key);
    cart.couponCode = coupon.code;
    touchCart(cart);
    return json(toCartView(cart));
  }),

  route("delete", "/cart/coupon", ({ request }) => {
    const cart = getCart(cartOwner(request).key);
    cart.couponCode = null;
    touchCart(cart);
    return json(toCartView(cart));
  }),

  route("post", "/quotes", async ({ request }) => {
    const owner = cartOwner(request);
    const body = await readBody(request, quoteSchema);
    return json(buildQuote(getCart(owner.key), body.network));
  }),
];
