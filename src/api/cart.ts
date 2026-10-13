import type {
  AddCartItemRequest,
  ApplyCouponRequest,
  Cart,
  Quote,
  QuoteRequest,
  UpdateCartItemRequest,
} from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

export async function getCart(options?: RequestOptions) {
  const { data } = await http.get<Cart>("/cart", options);
  return data;
}

export async function addCartItem(body: AddCartItemRequest) {
  const { data } = await http.post<Cart>("/cart/items", body);
  return data;
}

export async function updateCartItem(lineId: string, body: UpdateCartItemRequest) {
  const { data } = await http.patch<Cart>(`/cart/items/${encodeURIComponent(lineId)}`, body);
  return data;
}

export async function removeCartItem(lineId: string) {
  const { data } = await http.delete<Cart>(`/cart/items/${encodeURIComponent(lineId)}`);
  return data;
}

export async function applyCoupon(body: ApplyCouponRequest) {
  const { data } = await http.put<Cart>("/cart/coupon", body);
  return data;
}

export async function removeCoupon() {
  const { data } = await http.delete<Cart>("/cart/coupon");
  return data;
}

/** Cotação do carrinho atual: valida cupom e disponibilidade e calcula descontos, taxa e total. */
export async function createQuote(body: QuoteRequest = {}, options?: RequestOptions) {
  const { data } = await http.post<Quote>("/quotes", body, options);
  return data;
}
