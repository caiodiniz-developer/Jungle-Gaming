import { expect, test as base, type Locator, type Page } from "@playwright/test";

/** Credenciais fictícias das fixtures (ver README). */
export const USERS = {
  collector: { email: "colecionador@kurio.test", password: "Kurio@123", name: "Nova Sato" },
  other: { email: "nova@kurio.test", password: "Kurio@456", name: "Iris Okafor" },
} as const;

type Credentials = { email: string; password: string };

/**
 * Ações comuns dos testes. Tudo passa pela interface; a simulação só é
 * controlada por `window.__kurioMocks` (cenários, eventos, relógio dos pedidos),
 * que age no banco simulado e no servidor Socket.IO do mock — nunca na UI.
 */
export class App {
  constructor(readonly page: Page) {}

  get isMobile(): boolean {
    return (this.page.viewportSize()?.width ?? 1440) < 1024;
  }

  /** Abre uma rota; `scenario` seleciona um cenário nomeado dos mocks. */
  async open(path = "/", scenario?: string) {
    const url = new URL(path, "http://app.local");
    if (scenario) url.searchParams.set("cenario", scenario);
    await this.page.goto(url.pathname + url.search + url.hash);
    await this.page.waitForFunction(() => "__kurioMocks" in window);
  }

  /** Chama um controle da simulação (`window.__kurioMocks`). */
  mocks<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(
      ([name, params]) => {
        const control = (window as unknown as { __kurioMocks: Record<string, (...a: unknown[]) => unknown> })
          .__kurioMocks;
        return control[name as string]!(...(params as unknown[])) as never;
      },
      [method, args] as const,
    ) as Promise<T>;
  }

  /** Caminho atual, com busca e âncora, decodificado. */
  path(): string {
    const url = new URL(this.page.url());
    return decodeURIComponent(url.pathname + url.search + url.hash);
  }

  /** Onde ficam os campos de login/cadastro: diálogo no desktop, tela inteira no mobile. */
  authScope(): Locator {
    return this.isMobile ? this.page.locator("main") : this.page.getByRole("dialog");
  }

  async fillLogin({ email, password }: Credentials) {
    const scope = this.authScope();
    await scope.getByRole("textbox", { name: "E-mail" }).fill(email);
    await scope.getByRole("textbox", { name: "Senha" }).fill(password);
    await scope.getByRole("button", { name: "Entrar", exact: true }).click();
  }

  /** Preenche o login (já na tela de entrar) e espera sair dela. */
  async login(user: Credentials = USERS.collector) {
    await this.fillLogin(user);
    await this.page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  }

  /** Entra e vai direto para `path`. */
  async loginAndOpen(path: string, user: Credentials = USERS.collector) {
    await this.open(`/entrar?redirect=${encodeURIComponent(path)}`);
    await this.login(user);
  }

  /** Abre o detalhe e compra: termina no carrinho com a linha visível. */
  async addToCart(nftId = "nft-0009") {
    await this.open(`/nft/${nftId}`);
    await this.page.getByRole("button", { name: this.isMobile ? "Comprar NFT" : "COMPRAR" }).click();
    await this.page.waitForURL(/\/carrinho/);
    await expect(this.cartLines().first()).toBeVisible();
  }

  cartLines(): Locator {
    return this.page.getByTestId("cart-line");
  }

  quoteTotal(): Locator {
    return this.page.getByTestId("quote-total");
  }

  /** Do carrinho (visitante) até o pagamento, opcionalmente com a carteira conectada. */
  async goToCheckout({ connect = true, user = USERS.collector as Credentials } = {}) {
    await this.page.getByRole("button", { name: "Conectar e finalizar" }).click();
    await this.page.waitForURL(/\/entrar/);
    await this.login(user);
    await this.page.waitForURL(/\/pagamento/);
    await expect(this.quoteTotal()).toBeVisible();
    if (connect) await this.connectWallet();
  }

  async connectWallet() {
    await this.page.getByRole("button", { name: "Conectar carteira" }).click();
    await expect(this.page.getByText("Carteira conectada:")).toBeVisible();
  }

  confirmButton(): Locator {
    return this.page.getByRole("button", { name: /^Confirmar/ });
  }

  /** Recibo do pedido no estado indicado. */
  order(status: "pending" | "confirmed" | "rejected"): Locator {
    return this.page.locator(`[data-testid=order][data-status=${status}]`);
  }

  /** Id do pedido aberto em /pedidos/<id>. */
  orderId(): string {
    return new URL(this.page.url()).pathname.split("/").pop() ?? "";
  }

  ordersOnServer(): Promise<{ id: string; status: string; total: string }[]> {
    return this.mocks("listOrders");
  }
}

/** Largura do conteúdo não pode passar da largura da tela. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "sem rolagem horizontal").toBeLessThanOrEqual(clientWidth);
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await use(new App(page));
    expect(pageErrors, "nenhum erro de JavaScript não tratado").toEqual([]);
  },
});

export { expect };
