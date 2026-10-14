import { expect, expectNoHorizontalOverflow, test } from "./support/app";

test.describe("Acessibilidade e responsividade", () => {
  test("teclado: link de pular para o conteúdo, navegação e foco visível", async ({ app, page }) => {
    await app.open("/");
    await expect(page.locator("#catalogo article")).toHaveCount(9);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);

    // o foco de teclado tem contorno visível
    const market = page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Mercado" });
    await market.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(market).toBeFocused();
    const outline = await market.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");

    // um card inteiro é operável por teclado: Enter no link abre o detalhe
    await page.locator("#catalogo article").first().getByRole("link", { name: "Emerald Ape #042", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/nft\/nft-0042/);
  });

  test("diálogo de login: foco inicial no primeiro campo, foco preso e Esc fecha", async ({ app, page }) => {
    await app.open("/entrar");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("textbox", { name: "E-mail" })).toBeFocused();

    // percorre mais elementos do que o diálogo tem: o foco nunca sai dele
    for (let step = 0; step < 14; step += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest("[role=dialog]")),
      );
      expect(inside, "o foco permanece dentro do diálogo").toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test("zoom da galeria: o diálogo recebe o foco e o devolve ao fechar", async ({ app, page }) => {
    await app.open("/nft/nft-0042");
    const trigger = page.getByRole("button", { name: "Ampliar imagem de Emerald Ape #042" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Emerald Ape #042" });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("formulários: erro associado ao campo e anunciado", async ({ app, page }) => {
    await app.open("/cadastro");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Criar conta" }).click();

    const email = dialog.getByRole("textbox", { name: "E-mail" });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const describedBy = await email.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const message = page.locator(`[id="${describedBy}"]`);
    await expect(message).toHaveAttribute("role", "alert");
    await expect(message).toContainText("Informe o e-mail.");

    // o mesmo vale para erros que vêm da API
    await app.addToCart("nft-0009");
    await page.getByLabel("Código promocional").fill("naoexiste");
    await page.getByRole("button", { name: "Aplicar" }).click();
    const coupon = page.getByLabel("Código promocional");
    await expect(coupon).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`[id="${await coupon.getAttribute("aria-describedby")}"]`)).toHaveText(
      /Código promocional inválido\./,
    );
  });

  test("semântica: imagens com alternativa textual, estados não dependem só de cor", async ({ app, page }) => {
    await app.open("/");
    await expect(page.locator("main img:not([alt])")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Emerald Ape #042" }).first()).toBeVisible();

    // filtro marcado tem estado exposto (checkbox), não apenas a cor do texto
    const filter = page.getByRole("checkbox", { name: /Fotografia/ });
    await filter.check();
    await expect(filter).toBeChecked();

    // item de navegação ativo é anunciado
    await expect(
      page.getByRole("navigation", { name: "Principal" }).locator("[aria-current=page]"),
    ).toHaveText("Início");

    // edição esgotada é dita no nome acessível, além do risco e da cor
    await app.open("/nft/nft-0042");
    await expect(page.getByRole("radio", { name: "1/1 (esgotada)" })).toBeVisible();
  });

  test("mutations e eventos têm retorno acessível (regiões vivas)", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    // os avisos (toasts) ficam numa região com rótulo
    await page.getByRole("button", { name: "Remover Sage Nomad #009 do carrinho" }).click();
    await expect(
      page.getByRole("region", { name: /Notificações/ }).getByText("Sage Nomad #009 removido do carrinho."),
    ).toBeVisible();

    // o resultado da busca é anunciado por uma região de status
    await app.open("/?q=emerald");
    await expect(page.locator("#catalogo p[role=status]")).toHaveText(/NFTs? encontrados?\./);
  });

  test("cada tela tem um título de documento próprio", async ({ app, page }) => {
    await app.open("/");
    await expect(page).toHaveTitle("Kurio — Marketplace de NFTs");
    await app.open("/nft/nft-0042");
    await expect(page).toHaveTitle("Emerald Ape #042 — Kurio");
    await app.open("/carrinho");
    await expect(page).toHaveTitle("Carrinho de NFTs — Kurio");
    await app.open("/entrar");
    await expect(page).toHaveTitle("Entrar — Kurio");
    await app.open("/rota-que-nao-existe");
    await expect(page).toHaveTitle("Página não encontrada — Kurio");
  });

  for (const width of [390, 768, 1440]) {
    test(`sem rolagem horizontal em ${width}px nas telas principais`, async ({ app, page }) => {
      await page.setViewportSize({ width, height: 900 });
      await app.loginAndOpen("/conta/perfil");
      for (const path of ["/", "/nft/nft-0042", "/carrinho", "/conta/perfil", "/conta/carteiras", "/entrar"]) {
        await app.open(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
      }
      await app.addToCart("nft-0009");
      await expectNoHorizontalOverflow(page);
      await app.open("/pagamento");
      await expect(page.getByRole("button", { name: "Conectar carteira" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("zoom de 200%: o conteúdo continua acessível, sem rolagem horizontal", async ({ app, page }) => {
    // 1440px com zoom de 200% equivale a uma janela de 720px CSS
    await page.setViewportSize({ width: 720, height: 450 });
    await app.open("/nft/nft-0042");
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("button", { name: "Comprar NFT" })).toBeVisible();
  });

  test("animações: com movimento normal o conteúdo é revelado ao rolar; com movimento reduzido já está visível", async ({
    app,
    page,
    browser,
  }) => {
    // este projeto roda com movimento reduzido: nada espera a rolagem
    await app.open("/");
    await expect(page.locator(".reveal").first()).toHaveCSS("opacity", "1");

    const context = await browser.newContext({ reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } });
    const animated = await context.newPage();
    await animated.goto("/");
    const blog = animated.locator("li.reveal").first();
    await expect(blog).toHaveAttribute("data-revealed", "false");
    await blog.scrollIntoViewIfNeeded();
    await expect(blog).toHaveAttribute("data-revealed", "true");
    await expect(blog).toHaveCSS("opacity", "1");
    await context.close();
  });
});
