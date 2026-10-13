import { expect, test } from "./support/app";

const cards = (page: import("@playwright/test").Page) => page.locator("#catalogo article");

test.describe("Carregamento, falhas e recuperação", () => {
  test("rede lenta: skeletons no catálogo, no detalhe e no resumo do carrinho", async ({ app, page }) => {
    await app.open("/", "rede-lenta");
    const loading = page.getByRole("status", { name: "Carregando NFTs" });
    await expect(loading).toBeVisible();
    expect(await loading.locator("[data-slot=skeleton]").count()).toBeGreaterThan(8);
    // o skeleton tem o efeito shimmer
    await expect(loading.locator("[data-slot=skeleton]").first()).toHaveClass(/animate-shimmer/);
    await expect(cards(page)).toHaveCount(9, { timeout: 15_000 });

    await page.goto("/nft/nft-0042");
    await expect(page.getByRole("status", { name: "Carregando NFT" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "COMPRAR" }).click();
    await page.waitForURL(/\/carrinho/, { timeout: 15_000 });
    await expect(page.getByRole("status", { name: "Calculando valores" })).toBeVisible({ timeout: 15_000 });
    await expect(app.quoteTotal()).toBeVisible({ timeout: 15_000 });
  });

  test("o skeleton reserva o espaço: a grade não desloca o que vem depois", async ({ app, page }) => {
    await app.open("/", "rede-lenta");
    const loading = page.getByRole("status", { name: "Carregando NFTs" });
    await expect(loading).toBeVisible();
    const skeletonHeight = (await loading.boundingBox())?.height ?? 0;
    await expect(cards(page)).toHaveCount(9, { timeout: 15_000 });
    const gridHeight = (await page.locator("#catalogo ul").last().boundingBox())?.height ?? 0;
    // mesma grade, mesmas proporções: a diferença fica abaixo de 5%
    expect(Math.abs(gridHeight - skeletonHeight) / gridHeight).toBeLessThan(0.05);
  });

  test("erro 500: mensagem com nova tentativa, que recupera a lista", async ({ app, page }) => {
    await app.open("/", "erro-servidor");
    const alert = page.getByRole("alert").filter({ hasText: "Não foi possível carregar o catálogo" });
    await expect(alert).toBeVisible({ timeout: 20_000 });
    await expect(alert).toContainText("Erro interno do servidor. Tente novamente.");

    await app.mocks("setScenario", "padrao");
    await alert.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(cards(page)).toHaveCount(9);
  });

  test("detalhe com erro do servidor também se recupera", async ({ app, page }) => {
    await app.open("/nft/nft-0042", "erro-servidor");
    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible({ timeout: 20_000 });
    await app.mocks("setScenario", "padrao");
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
  });

  test("sem conexão: a falha de rede é informada e a tela se recupera", async ({ app, page }) => {
    await app.open("/", "offline");
    const alert = page.getByRole("alert").filter({ hasText: "Não foi possível carregar o catálogo" });
    await expect(alert).toBeVisible({ timeout: 20_000 });
    await expect(alert).toContainText("Sem conexão com o servidor.");

    await app.mocks("setScenario", "padrao");
    await alert.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(cards(page)).toHaveCount(9);
  });

  test("falha transitória (503 duas vezes): a consulta é repetida sozinha e a lista aparece", async ({
    app,
    page,
  }) => {
    await app.open("/", "falha-transitoria");
    await expect(cards(page)).toHaveCount(9, { timeout: 20_000 });
    await expect(page.getByRole("alert").filter({ hasText: "Não foi possível" })).toHaveCount(0);
  });
});
