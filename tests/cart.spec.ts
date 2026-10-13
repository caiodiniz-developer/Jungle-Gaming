import { expect, test } from "./support/app";

test.describe("Carrinho", () => {
  test("quantidades, limite por edição e remoção", async ({ app, page }) => {
    await app.open("/carrinho");
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();

    await app.addToCart("nft-0009");
    await expect(app.cartLines()).toHaveCount(1);
    await expect(page.getByTestId("line-total")).toContainText("1.69 ETH");
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");

    // a quantidade muda na hora; os valores vêm da API
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await expect(page.locator("output")).toHaveText("2");
    await expect(page.getByTestId("line-total")).toContainText("3.38 ETH");
    await expect(page.getByTestId("quote-subtotal")).toHaveText("3.38 ETH");
    await expect(app.quoteTotal()).toHaveText("3.396 ETH");
    await expect(page.getByRole("link", { name: "Carrinho, 2 itens" })).toBeVisible();

    // não passa do limite da edição
    const increase = page.getByRole("button", { name: "Aumentar quantidade" });
    while (await increase.isEnabled()) {
      await increase.click();
      await expect(app.quoteTotal()).not.toHaveAttribute("aria-busy", "true");
    }
    await expect(increase).toBeDisabled();

    await page.getByRole("button", { name: "Remover Sage Nomad #009 do carrinho" }).click();
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });

  test("cupom: vazio, inválido, expirado, aplicado e removido", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    const field = page.getByLabel("Código promocional");
    const apply = page.getByRole("button", { name: "Aplicar" });

    await apply.click();
    await expect(page.getByText("Digite o código promocional.")).toBeVisible();

    await field.fill("naoexiste");
    await apply.click();
    await expect(page.getByText("Código promocional inválido.")).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");

    await field.fill("expirado");
    await apply.click();
    await expect(page.getByText("Este código promocional expirou.")).toBeVisible();
    await expect(page.getByTestId("quote-discount")).toContainText("00.00");

    await field.fill("kurio10");
    await apply.click();
    await expect(page.getByText("Cupom KURIO10 aplicado.", { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId("quote-discount")).toContainText("0.169 ETH");
    await expect(app.quoteTotal()).toHaveText("1.537 ETH");

    await page.getByRole("button", { name: "Remover cupom" }).click();
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");
    await expect(field).toBeVisible();
  });

  test("o carrinho sobrevive ao refresh e os itens do visitante são preservados ao entrar", async ({
    app,
    page,
  }) => {
    await app.addToCart("nft-0009");
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    // espera a API confirmar a nova quantidade (o número em si muda antes, de forma otimista)
    await expect(page.getByTestId("line-total")).toContainText("3.38 ETH");

    await page.reload();
    await expect(app.cartLines()).toHaveCount(1);
    await expect(page.locator("output")).toHaveText("2");

    // visitante → login: o carrinho é incorporado à conta
    await app.goToCheckout({ connect: false });
    await expect(page.getByText("Sage Nomad #009")).toBeVisible();
    await expect(app.quoteTotal()).toHaveText("3.396 ETH");

    await app.open("/carrinho");
    await expect(app.cartLines()).toHaveCount(1);
    await expect(page.locator("output")).toHaveText("2");
  });

  test("falha ao alterar a quantidade desfaz a atualização otimista", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    await app.mocks("patchConfig", {
      faults: [{ route: "PATCH /cart/items/:id", kind: "http", status: 500, code: "INTERNAL_ERROR", times: 1 }],
    });

    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await expect(page.getByText("Erro interno do servidor. Tente novamente.")).toBeVisible();
    await expect(page.locator("output")).toHaveText("1");
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");

    // a falha era única: a nova tentativa funciona
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await expect(page.getByTestId("line-total")).toContainText("3.38 ETH");
  });
});
