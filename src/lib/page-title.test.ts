import { describe, expect, it } from "vitest";
import { HOME_TITLE, pageTitle } from "@/lib/page-title";

describe("pageTitle", () => {
  it("dá um título próprio a cada tela", () => {
    expect(pageTitle("/")).toBe(HOME_TITLE);
    expect(pageTitle("/carrinho")).toBe("Carrinho de NFTs — Kurio");
    expect(pageTitle("/conta/carteiras")).toBe("Carteiras — Kurio");
    expect(pageTitle("/pedidos/ord_0001")).toBe("Pedido — Kurio");
  });

  it("prefere o caminho mais específico", () => {
    expect(pageTitle("/conta/perfil")).toBe("Perfil do colecionador — Kurio");
    expect(pageTitle("/conta")).toBe("Minha conta — Kurio");
  });

  it("não confunde prefixos parecidos e marca rotas desconhecidas", () => {
    expect(pageTitle("/contato")).toBe("Página não encontrada — Kurio");
    expect(pageTitle("/nao-existe")).toBe("Página não encontrada — Kurio");
  });
});
