import { expect, test } from "./support/app";

test.describe("Detalhes do NFT", () => {
  test("acesso direto mostra galeria, informações e compra", async ({ app, page }) => {
    await app.open("/nft/nft-0042");
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
    await expect(page.getByTestId("nft-price")).toContainText("1.19 ETH");
    await expect(page.getByText("ID do token:")).toBeVisible();

    // galeria: trocar o enquadramento muda a imagem principal
    await page.getByRole("button", { name: "Mostrar rosto" }).click();
    await expect(page.getByRole("button", { name: "Mostrar rosto" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("img", { name: "Emerald Ape #042 — rosto" })).toBeVisible();
  });

  test("NFT inexistente tem tela própria", async ({ app, page }) => {
    await app.open("/nft/nao-existe");
    await expect(page.getByRole("heading", { level: 1, name: "NFT não encontrado" })).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("edição esgotada bloqueia a compra e a quantidade respeita o limite", async ({ app, page }) => {
    await app.open("/nft/nft-0042");
    await expect(page.getByRole("button", { name: "Diminuir quantidade" })).toBeDisabled();

    await page.getByRole("radio", { name: "1/1 (esgotada)" }).check();
    await expect(page.getByText("A edição 1/1 está esgotada. Escolha outra edição.")).toBeVisible();
    await expect(page.getByRole("button", { name: "COMPRAR" })).toBeDisabled();

    await page.getByRole("radio", { name: "1/10", exact: true }).check();
    await expect(page.getByRole("button", { name: "COMPRAR" })).toBeEnabled();
    const increase = page.getByRole("button", { name: "Aumentar quantidade" });
    while (await increase.isEnabled()) await increase.click();
    const limit = Number(await page.locator("output").textContent());
    await expect(page.getByText(new RegExp(`até ${limit} por pedido`))).toBeVisible();
  });

  test("rota inexistente mostra a página 404", async ({ app, page }) => {
    await app.open("/uma/rota/que/nao/existe");
    await expect(page.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
  });
});
