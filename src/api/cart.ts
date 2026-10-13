import type {
  AddCartItemRequest,
  ApplyCouponRequest,
  Cart,
  Quote,
  QuoteRequest,
  UpdateCartItemRequest,
} from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

// busca o carrinho atual
export async function getCart(options?: RequestOptions) {
  const { data } = await http.get<Cart>("/cart", options);
  return data;
}

// adiciona um item ao carrinho
export async function addCartItem(body: AddCartItemRequest) {
  const { data } = await http.post<Cart>("/cart/items", body);
  return data;
}

// altera a quantidade de uma linha
export async function updateCartItem(lineId: string, body: UpdateCartItemRequest) {
  const { data } = await http.patch<Cart>(`/cart/items/${encodeURIComponent(lineId)}`, body);
  return data;
}

// remove uma linha do carrinho
export async function removeCartItem(lineId: string) {
  const { data } = await http.delete<Cart>(`/cart/items/${encodeURIComponent(lineId)}`);
  return data;
}

// aplica um cupom
export async function applyCoupon(body: ApplyCouponRequest) {
  const { data } = await http.put<Cart>("/cart/coupon", body);
  return data;
}

// remove o cupom aplicado
export async function removeCoupon() {
  const { data } = await http.delete<Cart>("/cart/coupon");
  return data;
}

/** Cotação do carrinho atual: valida cupom e disponibilidade e calcula descontos, taxa e total. */
export async function createQuote(body: QuoteRequest = {}, options?: RequestOptions) {
  const { data } = await http.post<Quote>("/quotes", body, options);
  return data;
}
