import type { Page } from "@playwright/test";
import { expect, test } from "./support/app";

/**
 * Regressão visual de início, detalhe, carrinho e pagamento, nos dois
 * viewports. Os dados são os das fixtures (estado inicial dos mocks), então as
 * imagens são estáveis. As baselines ficam versionadas em
 * `tests/visual.spec.ts-snapshots/` e são específicas do sistema operacional
 * (sufixo do arquivo); `pnpm test:e2e:update` gera as do ambiente atual.
 */

/** Espera fontes e imagens visíveis, para a captura não pegar a página pela metade. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    // só as imagens que aparecem na captura: as demais são lazy e podem nem carregar
    const inView = [...document.images].filter((image) => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.top < innerHeight && box.bottom > 0 && box.left < innerWidth && box.right > 0;
    });
    await Promise.all(
      inView.map((image) =>
        image.complete
          ? null
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
              setTimeout(resolve, 5000);
            }),
      ),
    );
  });
}

test.describe("Regressão visual", () => {
  test("início", async ({ app, page }) => {
    await app.open("/");
    await expect(page.locator("#catalogo article")).toHaveCount(9);
    await settle(page);
    await expect(page).toHaveScreenshot("inicio.png");

    await page.locator("#catalogo").scrollIntoViewIfNeeded();
    await settle(page);
    await expect(page).toHaveScreenshot("inicio-catalogo.png");
  });

  test("detalhes do NFT", async ({ app, page }) => {
    await app.open("/nft/nft-0042");
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("detalhe.png");
  });

  test("carrinho", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");
    await settle(page);
    await expect(page).toHaveScreenshot("carrinho.png");
  });

  test("pagamento", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    await app.goToCheckout({ connect: false });
    await expect(app.checkoutTotal()).toHaveText("1.706 ETH");
    await settle(page);
    await expect(page).toHaveScreenshot("pagamento.png");
  });
});
