import { describe, expect, it } from "vitest";
import { isProtectedPath, safeRedirect } from "@/features/auth/guards";

describe("destino após o login", () => {
  it("aceita caminhos internos, com busca e âncora", () => {
    expect(safeRedirect("/pagamento")).toBe("/pagamento");
    expect(safeRedirect("/?colecoes=musica#catalogo")).toBe("/?colecoes=musica#catalogo");
  });

  it("recusa endereços externos (redirecionamento aberto)", () => {
    expect(safeRedirect("https://exemplo.com")).toBe("/");
    expect(safeRedirect("//exemplo.com")).toBe("/");
    expect(safeRedirect("javascript:alert(1)")).toBe("/");
  });

  it("não devolve o usuário às telas de entrar e cadastro", () => {
    expect(safeRedirect("/entrar?redirect=/conta")).toBe("/");
    expect(safeRedirect("/cadastro")).toBe("/");
  });

  it("sem destino, vai para o início", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect("")).toBe("/");
  });
});

describe("rotas que exigem conta", () => {
  it("checkout, pedidos e área da conta são privadas", () => {
    expect(isProtectedPath("/pagamento")).toBe(true);
    expect(isProtectedPath("/pedidos/ord_0001")).toBe(true);
    expect(isProtectedPath("/conta/carteiras")).toBe(true);
  });

  it("catálogo, detalhe e carrinho são públicos", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/nft/nft-0042")).toBe(false);
    expect(isProtectedPath("/carrinho")).toBe(false);
  });
});
