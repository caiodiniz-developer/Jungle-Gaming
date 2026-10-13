import { expect, test } from "./support/app";

const favoriteButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /(Favoritar|Remover) Ivory Baron #088/ }).first();

test.describe("Favoritos", () => {
  test("visitante é levado ao login e volta para o NFT", async ({ app, page }) => {
    await app.open("/nft/nft-0207");
    await page.getByRole("button", { name: "Favoritar Golden Beat #207" }).click();
    await expect(page).toHaveURL(/\/entrar\?redirect=/);
    await app.login();
    await expect(page).toHaveURL(/\/nft\/nft-0207/);
  });

  test("favoritar persiste para o usuário após o refresh", async ({ app, page }) => {
    await app.loginAndOpen("/nft/nft-0207");
    const button = page.getByRole("button", { name: /(Favoritar|Remover) Golden Beat #207/ }).first();
    await expect(button).toHaveAttribute("aria-pressed", "false");

    await button.click();
    await expect(page.getByText("Golden Beat #207 adicionado aos favoritos.")).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(button).toHaveAttribute("aria-pressed", "true");

    // e aparece na lista de interesse da conta
    await app.open("/conta/favoritos");
    await expect(page.getByRole("link", { name: "Golden Beat #207", exact: true })).toBeVisible();
  });

  test("falha da mutation desfaz a atualização otimista; a nova tentativa funciona", async ({ app, page }) => {
    await app.loginAndOpen("/nft/nft-0088");
    await expect(favoriteButton(page)).toHaveAttribute("aria-pressed", "true");

    // a API passa a responder 500 para favoritar e desfavoritar
    await app.mocks("setScenario", "falha-favorito");
    await favoriteButton(page).click();
    await expect(page.getByText("Não foi possível remover Ivory Baron #088 dos favoritos. Tente novamente.")).toBeVisible();
    // rollback: o estado em tela volta a ser o do servidor
    await expect(favoriteButton(page)).toHaveAttribute("aria-pressed", "true");

    await app.mocks("setScenario", "padrao");
    await favoriteButton(page).click();
    await expect(page.getByText("Ivory Baron #088 removido dos favoritos.")).toBeVisible();
    await expect(favoriteButton(page)).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(favoriteButton(page)).toHaveAttribute("aria-pressed", "false");
  });
});
