import { expect, test, USERS } from "./support/app";

/**
 * Todos os eventos saem do servidor Socket.IO simulado (MSW) e chegam à página
 * pelo socket.io-client da aplicação. Os testes só mudam o banco simulado ou
 * derrubam conexões; nunca tocam no cache nem nos componentes.
 */
test.describe("Tempo real", () => {
  test("nft.updated atualiza catálogo e detalhe; duplicata e evento antigo são ignorados", async ({
    app,
    page,
  }) => {
    await app.open("/");
    const card = page.locator("#catalogo article").filter({ hasText: "Sage Nomad #009" });
    await expect(card).toContainText("1.69 ETH");
    await expect.poll(() => app.mocks<number>("connectionCount")).toBeGreaterThan(0);

    await app.mocks("updateNft", "nft-0009", { price: "1.75" });
    await expect(card).toContainText("1.75 ETH");

    await app.open("/nft/nft-0009");
    await expect(page.getByTestId("nft-price")).toContainText("1.75 ETH");
    await expect.poll(() => app.mocks<number>("connectionCount")).toBeGreaterThan(0);

    await app.mocks("updateNft", "nft-0009", { price: "1.80" });
    await expect(page.getByTestId("nft-price")).toContainText("1.80 ETH");
    await expect(page.getByText("O preço de Sage Nomad #009 mudou.")).toHaveCount(1);

    // o mesmo evento de novo (mesmo id) e um evento com versão anterior e outro preço
    await app.mocks("replayEvent");
    await app.mocks("emitStaleNftEvent", "nft-0009", "0.01");
    await page.waitForTimeout(600);
    await expect(page.getByTestId("nft-price")).toContainText("1.80 ETH");
    await expect(page.getByText("O preço de Sage Nomad #009 mudou.")).toHaveCount(1);
  });

  test("disponibilidade muda no detalhe: a edição esgota em tempo real", async ({ app, page }) => {
    await app.open("/nft/nft-0009");
    await expect(page.getByRole("button", { name: "COMPRAR" })).toBeEnabled();
    await expect.poll(() => app.mocks<number>("connectionCount")).toBeGreaterThan(0);

    await app.mocks("updateNft", "nft-0009", { editions: { "1-50": 0 } });
    await expect(page.getByText("A edição 1/50 está esgotada. Escolha outra edição.")).toBeVisible();
    await expect(page.getByRole("button", { name: "COMPRAR" })).toBeDisabled();
  });

  test("preço e disponibilidade mudam com o carrinho aberto: aviso, resumo atualizado e bloqueio", async ({
    app,
    page,
  }) => {
    await app.addToCart("nft-0009");
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await expect(app.quoteTotal()).toHaveText("3.396 ETH");

    await app.mocks("updateNft", "nft-0009", { price: "2" });
    await expect(page.getByText("O preço de Sage Nomad #009 mudou.")).toBeVisible();
    await expect(page.getByTestId("line-total")).toContainText("4.00 ETH");
    await expect(app.quoteTotal()).toHaveText("4.016 ETH");

    await app.mocks("updateNft", "nft-0009", { editions: { "1-50": 1 } });
    await expect(page.getByText("A disponibilidade de Sage Nomad #009 mudou.")).toBeVisible();
    await expect(page.getByText("só há 1 unidade disponível desta edição.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Conectar e finalizar" })).toBeDisabled();

    await page.getByRole("button", { name: "Ajustar para 1" }).click();
    await expect(app.quoteTotal()).toHaveText("2.016 ETH");
    await expect(page.getByRole("button", { name: "Conectar e finalizar" })).toBeEnabled();
  });

  test("preço muda durante o pagamento: o resumo é atualizado e a compra exige nova confirmação", async ({
    app,
    page,
  }) => {
    await app.addToCart("nft-0009");
    await app.goToCheckout();
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");
    await expect(app.confirmButton()).toHaveText("Confirmar compra");

    await app.mocks("updateNft", "nft-0009", { price: "2" });

    await expect(app.quoteTotal()).toHaveText("2.016 ETH");
    await expect(
      page.getByRole("alert").filter({ hasText: "Os valores mudaram desde a sua revisão." }),
    ).toContainText("O total passou de 1.706 ETH para 2.016 ETH.");
    await expect(app.confirmButton()).toHaveText("Confirmar com os novos valores");
    expect(await app.ordersOnServer()).toHaveLength(0);

    await app.confirmButton().click();
    await expect(app.order("confirmed")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText("2.016 ETH");
  });

  test("a edição esgota durante o pagamento: a compra é bloqueada na hora", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    await app.goToCheckout();
    await expect(app.confirmButton()).toBeEnabled();

    await app.mocks("updateNft", "nft-0009", { editions: { "1-50": 0 } });

    await expect(page.getByText("A disponibilidade de Sage Nomad #009 mudou.")).toBeVisible();
    await expect(page.getByText("Há itens indisponíveis no carrinho.")).toBeVisible();
    await expect(app.confirmButton()).toBeDisabled();
    expect(await app.ordersOnServer()).toHaveLength(0);

    await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
    await expect(app.cartLines().first()).toContainText("a edição 1/50 esgotou.");
  });

  test("cotação antiga é recusada pelo servidor mesmo que o evento se perca", async ({ app, page }) => {
    await app.addToCart("nft-0009");
    await app.goToCheckout();
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");

    // sem conexão, a página não fica sabendo da mudança de preço
    await app.mocks("dropConnections", { refuseNew: true });
    await app.mocks("updateNft", "nft-0009", { price: "2" });
    await page.waitForTimeout(400);
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");

    await app.confirmButton().click();
    await expect(page.getByRole("alert").filter({ hasText: "Os valores mudaram" })).toContainText(
      "O preço de Sage Nomad #009 mudou de 1.69 ETH para 2.00 ETH.",
    );
    await expect(app.quoteTotal()).toHaveText("2.016 ETH");
    expect(await app.ordersOnServer()).toHaveLength(0);
  });

  test("após reconectar, os recursos em tela são reconciliados pela API REST", async ({ app, page }) => {
    await app.open("/nft/nft-0009");
    await expect(page.getByTestId("nft-price")).toContainText("1.69 ETH");
    await expect.poll(() => app.mocks<number>("connectionCount")).toBeGreaterThan(0);

    await app.mocks("dropConnections", { refuseNew: true });
    await app.mocks("updateNft", "nft-0009", { price: "1.90" });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("nft-price")).toContainText("1.69 ETH");

    await app.mocks("restoreConnections");
    await expect(page.getByTestId("nft-price")).toContainText("1.90 ETH", { timeout: 15_000 });
  });

  test("pedido pendente: order.updated confirma; estado terminal não muda mais", async ({ app, page }) => {
    await app.open("/", "pedido-pendente");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aguardando a confirmação na rede");

    const orderId = app.orderId();
    await app.mocks("resolveOrder", orderId, "confirmed");
    await expect(app.order("confirmed")).toBeVisible();

    // confirmado é terminal: uma recusa posterior e a reentrega do evento não mudam nada
    await app.mocks("resolveOrder", orderId, "rejected");
    await app.mocks("replayEvent");
    await page.waitForTimeout(500);
    await expect(app.order("confirmed")).toBeVisible();
    expect(await app.ordersOnServer()).toEqual([expect.objectContaining({ id: orderId, status: "confirmed" })]);
  });

  test("evento de pedido de outra conta não chega à sessão seguinte nem altera seus dados", async ({ app, page }) => {
    // a conta A deixa um pedido pendente e sai
    await app.open("/", "pedido-pendente");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    const orderId = app.orderId();
    // o recibo é um diálogo modal no desktop: o menu da conta fica em outra tela
    await app.open("/");
    await page.getByRole("button", { name: /abrir menu da conta/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();

    // a conta B entra no mesmo navegador, com a mesma conexão Socket.IO
    await app.loginAndOpen("/conta/atividade", USERS.other);
    await expect(page.getByText("Você ainda não fez nenhum pedido.")).toBeVisible();
    await expect.poll(() => app.mocks<number>("connectionCount")).toBeGreaterThan(0);

    // o servidor entrega order.updated só ao dono: B não recebe nada
    await app.mocks("resolveOrder", orderId, "confirmed");
    // e mesmo que o servidor errasse o roteamento, o cliente descarta o evento de outra conta
    expect(await app.mocks("broadcastEvent")).not.toBeNull();
    await page.waitForTimeout(700);
    await expect(page.getByText(`Pedido ${orderId} confirmado.`)).toHaveCount(0);
    await expect(page.getByText("Você ainda não fez nenhum pedido.")).toBeVisible();

    // a API também nega o recibo de A para B
    await app.open(`/pedidos/${orderId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Este pedido pertence a outra conta" })).toBeVisible();
  });

  test("conexão cai com o pedido pendente: refresh e reconexão recuperam o estado sem nova compra", async ({
    app,
    page,
  }) => {
    await app.open("/", "pedido-pendente");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    const orderId = app.orderId();

    // recarregar mantém o pedido pendente
    await page.reload();
    await expect(app.order("pending")).toBeVisible();

    // o evento de confirmação se perde; a consulta periódica recupera o resultado
    await app.mocks("dropConnections", { refuseNew: true });
    await app.mocks("resolveOrder", orderId, "confirmed");
    await expect(app.order("confirmed")).toBeVisible({ timeout: 15_000 });
    await app.mocks("restoreConnections");

    await page.reload();
    await expect(app.order("confirmed")).toBeVisible();
    expect(await app.ordersOnServer()).toHaveLength(1);
  });
});
