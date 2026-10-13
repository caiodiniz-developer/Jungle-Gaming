import { expect, test } from "./support/app";

const cards = (page: import("@playwright/test").Page) => page.locator("#catalogo article");
const resultStatus = (page: import("@playwright/test").Page) => page.locator("#catalogo p[role=status]");

test.describe("Catálogo", () => {
  test("busca, filtros combinados, ordenação e paginação vivem na URL e sobrevivem ao histórico e ao refresh", async ({
    app,
    page,
  }) => {
    await app.open("/");
    await expect(cards(page)).toHaveCount(9);

    await page.getByRole("link", { name: "Página 3" }).click();
    await expect(page).toHaveURL(/pagina=3/);

    // mudar um filtro reinicia a paginação
    await page.getByRole("checkbox", { name: /Música/ }).check();
    await expect(page).toHaveURL(/colecoes=musica/);
    expect(app.path()).not.toContain("pagina=");
    await expect(resultStatus(page)).toHaveText("65 NFTs encontrados.");

    // filtros são combináveis
    await page.getByRole("checkbox", { name: /Polygon/ }).check();
    await expect(page).toHaveURL(/redes=polygon/);
    await expect(page).toHaveURL(/colecoes=musica/);
    await expect(resultStatus(page)).toHaveText(/^\d+ NFTs? encontrados?\.$/);
    const combined = await resultStatus(page).textContent();
    expect(Number.parseInt(combined ?? "", 10)).toBeLessThan(65);

    // voltar no histórico restaura o estado anterior dos filtros
    await page.goBack();
    await expect(page.getByRole("checkbox", { name: /Polygon/ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Música/ })).toBeChecked();
    await expect(resultStatus(page)).toHaveText("65 NFTs encontrados.");
    await page.goForward();
    await expect(page.getByRole("checkbox", { name: /Polygon/ })).toBeChecked();

    // refresh mantém tudo
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /Música/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Polygon/ })).toBeChecked();
    await expect(resultStatus(page)).toHaveText(combined ?? "");

    // ordenação: menor preço primeiro
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Menor preço" }).click();
    await expect(page).toHaveURL(/ordem=preco-asc/);
    // espera a lista ordenada substituir a anterior
    await expect
      .poll(async () => {
        const prices = await cards(page).locator("p > span:first-child").allTextContents();
        const values = prices.map((text) => Number.parseFloat(text));
        return values.length === 9 && values.every((value, index) => index === 0 || values[index - 1]! <= value);
      })
      .toBe(true);
  });

  test("a busca do header leva ao catálogo com o termo na URL", async ({ app, page }) => {
    await app.open("/nft/nft-0009");
    await page.getByRole("button", { name: "Abrir busca" }).click();
    await page.getByRole("searchbox", { name: "Buscar NFTs" }).fill("emerald");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=emerald/);
    // todos os cards exibidos correspondem ao termo
    await expect
      .poll(async () => {
        const names = await cards(page).locator("h3").allTextContents();
        return names.length > 0 && names.every((name) => name.toLowerCase().includes("emerald"));
      })
      .toBe(true);
  });

  test("resultado vazio: por filtro e por catálogo sem itens", async ({ app, page }) => {
    await app.open("/?q=termo-que-nao-existe");
    await expect(page.getByRole("heading", { name: "Nenhum NFT encontrado" })).toBeVisible();
    await expect(page.getByText("Nenhum item corresponde à busca e aos filtros selecionados.")).toBeVisible();
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(cards(page)).toHaveCount(9);

    await app.open("/", "catalogo-vazio");
    await expect(page.getByText("O catálogo está vazio no momento. Volte em breve.")).toBeVisible();
  });

  test("respostas fora de ordem: a lista reflete o último filtro, não a resposta mais lenta", async ({
    app,
    page,
  }) => {
    await app.open("/");
    await expect(cards(page)).toHaveCount(9);
    // a partir daqui a 1ª consulta leva 1,8 s e a 2ª, 0,15 s: a mais antiga chega por último
    await app.mocks("setScenario", "latencia-variavel");

    await page.getByRole("checkbox", { name: /Música/ }).check();
    await page.getByRole("checkbox", { name: /Polygon/ }).check();
    await expect(page).toHaveURL(/redes=polygon/);

    await expect(resultStatus(page)).toHaveText(/^\d+ NFTs? encontrados?\.$/);
    const afterFast = await resultStatus(page).textContent();
    expect(afterFast).not.toBe("65 NFTs encontrados.");

    // a resposta lenta (só "Música", 65 itens) chega depois e precisa ser descartada
    await page.waitForTimeout(2200);
    await expect(resultStatus(page)).toHaveText(afterFast ?? "");
    await expect(page.getByRole("checkbox", { name: /Polygon/ })).toBeChecked();
  });

  test("do card para o detalhe do NFT", async ({ app, page }) => {
    await app.open("/");
    await cards(page).first().getByRole("link", { name: "Emerald Ape #042", exact: true }).click();
    await expect(page).toHaveURL(/\/nft\/nft-0042/);
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
  });
});
