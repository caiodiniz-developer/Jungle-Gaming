import { expect, expectNoHorizontalOverflow, test, USERS } from "./support/app";

/** Fluxos principais no viewport mobile (390 × 844), onde a estrutura das telas muda. */
test.describe("Mobile", () => {
  test("busca e filtros no painel lateral, com foco controlado", async ({ app, page }) => {
    await app.open("/");
    await expect(page.locator("#catalogo article")).toHaveCount(9);

    // a busca atualiza a URL depois de uma pausa na digitação
    await page.getByRole("searchbox", { name: "Buscar NFTs" }).fill("golden");
    await expect(page).toHaveURL(/q=golden/);
    await expect(page.locator("#catalogo article").first()).toContainText("Golden");

    const trigger = page.getByRole("button", { name: "Abrir filtros" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Filtros" });
    await expect(drawer).toBeVisible();
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")))).toBe(true);

    await drawer.getByRole("checkbox", { name: /Polygon/ }).check();
    await expect(page).toHaveURL(/redes=polygon/);
    await drawer.getByRole("button", { name: /^Ver \d+ resultados?$/ }).click();

    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(/q=golden/);
    await expectNoHorizontalOverflow(page);
  });

  test("compra completa no mobile: detalhe, carrinho, login, pagamento e recibo", async ({ app, page }) => {
    await app.open("/");
    await page.locator("#catalogo article").getByRole("link", { name: "Sage Nomad #009", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sage Nomad #009" })).toBeVisible();

    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await page.getByRole("button", { name: "Comprar NFT" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Carrinho de NFTs" })).toBeVisible();
    await expect(app.quoteTotal()).toHaveText("3.396 ETH");
    await expectNoHorizontalOverflow(page);

    await app.goToCheckout();
    await expect(page.getByRole("heading", { level: 1, name: "Pagamento com carteira" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await app.confirmButton().click();
    await expect(app.order("confirmed")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText("3.396 ETH");
    await expectNoHorizontalOverflow(page);
  });

  test("barra inferior navega entre início, carrinho e conta", async ({ app, page }) => {
    await app.open("/");
    const bar = page.getByRole("navigation", { name: "Navegação principal" });

    await bar.getByRole("link", { name: "Carrinho" }).click();
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();

    await app.open("/");
    await bar.getByRole("link", { name: "Entrar" }).click();
    await app.login(USERS.collector);
    await expect(bar.getByRole("link", { name: "Minha conta" })).toBeVisible();
    await bar.getByRole("link", { name: "Minha conta" }).click();
    await expect(page.getByLabel("Nome de exibição")).toHaveValue(USERS.collector.name);
  });

  test("perfil, carteiras e pedidos funcionam no mobile", async ({ app, page }) => {
    await app.loginAndOpen("/conta/perfil");
    await page.getByLabel("Apelido da carteira").fill("Cofre mobile");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Perfil atualizado.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("navigation", { name: "Minha conta" }).getByRole("link", { name: "Carteiras" }).click();
    await expect(page.getByRole("form", { name: "Carteira principal" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("navigation", { name: "Minha conta" }).getByRole("link", { name: "Atividade" }).click();
    await expect(page.getByText("Você ainda não fez nenhum pedido.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("primeira dobra pré-renderizada: aparece sem JavaScript e a aplicação assume sem troca visível", async ({
    app,
    page,
  }) => {
    // sem JavaScript, o HTML já mostra o NFT (imagem, nome e preço das fixtures)
    await page.route("**/assets/*.js", (route) => route.abort());
    await page.goto("/nft/nft-0042");
    const shell = page.locator("#shell");
    await expect(shell.getByText("Emerald Ape #042")).toBeVisible();
    await expect(shell.getByText("1.19 ETH")).toBeVisible();
    await expect(shell.locator("img[elementtiming]")).toHaveJSProperty("complete", true);
    // é decorativa até a aplicação assumir: fora da árvore de acessibilidade e sem interação
    await expect(shell).toHaveAttribute("aria-hidden", "true");
    await expect(shell).toHaveAttribute("inert", "");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);

    // com JavaScript, a aplicação monta por baixo e remove a camada quando os dados chegam
    await page.unroute("**/assets/*.js");
    await app.open("/nft/nft-0042");
    await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
    await expect(shell).toHaveCount(0);
    await expect(page).toHaveTitle("Emerald Ape #042 — Kurio");

    // o preço muda: daqui em diante o HTML das fixtures estaria desatualizado e não é mais exibido
    await app.mocks("updateNft", "nft-0042", { price: "3" });
    await page.route("**/assets/*.js", (route) => route.abort());
    await page.goto("/nft/nft-0042");
    await expect(page.locator("#shell-template")).toHaveCount(1);
    await expect(shell).toHaveCount(0);
    await page.unroute("**/assets/*.js");
    await app.open("/nft/nft-0042");
    await expect(page.getByTestId("nft-price")).toContainText("3.00 ETH");

    // a página inicial não depende de dados: a moldura pré-renderizada vale sempre
    await page.route("**/assets/*.js", (route) => route.abort());
    await page.goto("/");
    await expect(shell.getByText("SEJA DONO DA")).toBeVisible();
    // e nunca aparece em outra rota servida pelo mesmo index.html
    await page.goto("/carrinho");
    await expect(shell).toHaveCount(0);
  });

  test("pedido pendente no mobile: confirmado por evento, sem recarregar", async ({ app, page }) => {
    await app.open("/", "pedido-pendente");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    await app.mocks("resolveOrder", app.orderId(), "rejected", "Saldo insuficiente na carteira.");
    await expect(app.order("rejected")).toBeVisible();
    await expect(page.getByText("Saldo insuficiente na carteira.", { exact: false })).toBeVisible();
  });
});
