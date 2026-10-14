import { expect, test } from "./support/app";

test.describe("Pagamento e confirmação", () => {
  test("compra completa: do catálogo ao recibo confirmado", async ({ app, page }) => {
    await app.open("/");
    await page.locator("#catalogo article").getByRole("link", { name: "Sage Nomad #009", exact: true }).click();
    await page.getByRole("button", { name: "COMPRAR" }).click();
    await expect(app.cartLines()).toHaveCount(1);

    await app.goToCheckout({ connect: false });

    // dados do colecionador vêm preenchidos do perfil e são validados
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nova Sato");
    await page.getByLabel("Código de indicação").fill("x");
    await app.confirmButton().click();
    await expect(page.getByText("O código deve ter de 4 a 12 letras ou números.")).toBeVisible();
    await page.getByLabel("Código de indicação").fill("KURIO2026");

    // sem carteira conectada não há pedido
    await app.confirmButton().click();
    await expect(page.getByText("Conecte a carteira antes de confirmar a compra.")).toBeVisible();
    expect(await app.ordersOnServer()).toHaveLength(0);

    await app.connectWallet();
    const total = await app.quoteTotal().textContent();
    await app.confirmButton().click();

    // o pedido nasce pendente; a confirmação só aparece quando a simulação confirma
    await expect(page).toHaveURL(/\/pedidos\/ord_/);
    await expect(page.getByTestId("order")).toHaveAttribute("data-status", "pending");
    await expect(page.getByRole("link", { name: /Ver no Etherscan/ })).toHaveCount(0);

    await expect(app.order("confirmed")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seus NFTs agora estão na sua carteira");
    await expect(page.getByText("ID da transação")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText(total ?? "");
    await expect(page.getByText("Taxa de rede")).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver no Etherscan/ })).toHaveAttribute(
      "href",
      /^https:\/\/etherscan\.io\/tx\/0x/,
    );

    // o que foi comprado sai do carrinho
    await app.open("/carrinho");
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });

  test("clique repetido em confirmar cria um único pedido", async ({ app, page }) => {
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().dblclick();
    await expect(page).toHaveURL(/\/pedidos\/ord_0001/);
    expect(await app.ordersOnServer()).toHaveLength(1);
  });

  test("pagamento recusado: mostra o motivo e preserva o carrinho", async ({ app, page }) => {
    await app.open("/", "pagamento-recusado");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();

    await expect(app.order("rejected")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pagamento recusado");
    await expect(page.getByText("A carteira recusou a assinatura da transação.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver no Etherscan/ })).toHaveCount(0);

    await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
    await expect(app.cartLines()).toHaveCount(1);
  });

  test("timeout após criar o pedido: a nova tentativa recupera o mesmo pedido (relógio controlado)", async ({
    app,
    page,
  }) => {
    await app.open("/", "timeout-pedido");
    await app.addToCart();
    await app.goToCheckout();

    // a resposta do POST /orders nunca chega; o relógio avança além do timeout do cliente (10 s)
    await page.clock.install();
    await app.confirmButton().click();
    // enquanto envia, o botão fica desabilitado: não há segundo envio
    await expect(page.getByRole("button", { name: "Enviando pedido…" })).toBeDisabled();
    // o servidor precisa ter criado o pedido antes de o cliente desistir: avançar o relógio
    // antes disso cancelaria a requisição ainda na latência simulada
    await expect.poll(() => app.ordersOnServer()).toHaveLength(1);
    await page.clock.fastForward(11_000);

    await expect(page.getByText("Não recebemos a confirmação do envio.")).toBeVisible();
    // o pedido foi criado no servidor, embora o cliente não saiba
    expect(await app.ordersOnServer()).toHaveLength(1);

    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page).toHaveURL(/\/pedidos\/ord_0001/);
    await expect(page.getByTestId("order")).toBeVisible();
    expect(await app.ordersOnServer()).toHaveLength(1);
  });

  test("falha transitória no envio mantém formulário e carrinho; repetir não duplica", async ({ app, page }) => {
    await app.addToCart();
    await app.goToCheckout();
    await page.getByLabel("Observação do colecionador (opcional)").fill("Entregar na carteira principal");
    await app.mocks("patchConfig", {
      faults: [{ route: "POST /orders", kind: "http", status: 503, code: "SERVICE_UNAVAILABLE", times: 1 }],
    });

    await app.confirmButton().click();
    await expect(page.getByText("Não recebemos a confirmação do envio.")).toBeVisible();
    await expect(page.getByLabel("Observação do colecionador (opcional)")).toHaveValue(
      "Entregar na carteira principal",
    );
    expect(await app.ordersOnServer()).toHaveLength(0);

    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page).toHaveURL(/\/pedidos\/ord_0001/);
    expect(await app.ordersOnServer()).toHaveLength(1);
  });

  test("preço alterado no envio: mostra a mudança e exige nova confirmação", async ({ app, page }) => {
    await app.open("/", "preco-alterado");
    await app.addToCart();
    await app.goToCheckout();
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");

    await app.confirmButton().click();
    const notice = page.getByRole("alert").filter({ hasText: "Os valores mudaram desde a sua revisão." });
    await expect(notice).toContainText("O preço de Sage Nomad #009 mudou de 1.69 ETH para 1.859 ETH.");
    await expect(app.quoteTotal()).toHaveText("1.875 ETH");
    // nada foi comprado com a cotação antiga
    expect(await app.ordersOnServer()).toHaveLength(0);

    await page.getByRole("button", { name: "Confirmar com os novos valores" }).click();
    await expect(app.order("confirmed")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText("1.875 ETH");
  });

  test("edição esgotada no envio: bloqueia a compra e leva ao ajuste do carrinho", async ({ app, page }) => {
    await app.open("/", "edicao-esgotada");
    await app.addToCart();
    await app.goToCheckout();

    await app.confirmButton().click();
    await expect(page.getByRole("alert").filter({ hasText: "Os valores mudaram" })).toContainText(
      "Sage Nomad #009 esgotou.",
    );
    await expect(app.confirmButton()).toBeDisabled();
    expect(await app.ordersOnServer()).toHaveLength(0);

    await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
    await expect(app.cartLines().first()).toContainText("a edição 1/50 esgotou.");
    await expect(page.getByRole("button", { name: "Conectar e finalizar" })).toBeDisabled();
  });

  test("carteira: recusa, conexão e desconexão", async ({ app, page }) => {
    await app.open("/", "carteira-recusada");
    await app.addToCart();
    await app.goToCheckout({ connect: false });

    await page.getByRole("button", { name: "Conectar carteira" }).click();
    await expect(page.getByText("A conexão foi recusada na carteira.", { exact: false })).toBeVisible();

    // a carteira passa a aceitar
    await app.mocks("patchConfig", { walletRefuses: false });
    await page.getByRole("checkbox", { name: "Usar outra carteira?" }).check();
    await expect(page.getByRole("combobox", { name: "Rede" })).toHaveValue("polygon");
    await app.connectWallet();
    await expect(page.getByText("Reserva · Coinbase Wallet · Polygon", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Desconectar" }).click();
    await expect(page.getByRole("button", { name: "Conectar carteira" })).toBeVisible();
    await app.confirmButton().click();
    await expect(page.getByText("Conecte a carteira antes de confirmar a compra.")).toBeVisible();
  });

  test("sessão expirada no pagamento: volta ao login e retoma com o carrinho intacto", async ({ app, page }) => {
    await app.addToCart();
    await app.goToCheckout();
    await app.mocks("expireSessions");

    await app.confirmButton().click();
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/);
    expect(await app.ordersOnServer()).toHaveLength(0);

    await app.login();
    await expect(page).toHaveURL(/\/pagamento/);
    await expect(app.quoteTotal()).toHaveText("1.706 ETH");
  });

  test("o recibo é um snapshot: mudanças posteriores no catálogo não o alteram", async ({ app, page }) => {
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("confirmed")).toBeVisible();

    await app.mocks("updateNft", "nft-0009", { price: "9.99" });
    await page.reload();
    await expect(app.order("confirmed")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText("1.706 ETH");
    await expect(page.getByTestId("order")).toContainText("1.69 ETH");
  });

  test("após a confirmação, só os itens e quantidades comprados saem do carrinho", async ({ app }) => {
    await app.open("/", "pedido-pendente");
    await app.addToCart("nft-0009");
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    const orderId = app.orderId();

    // com o pedido pendente, o carrinho ganha outro NFT e mais uma unidade do que foi pedido
    await app.addToCart("nft-0207");
    await app.addToCart("nft-0009");
    await expect(app.cartLines()).toHaveCount(2);
    const ordered = app.cartLines().filter({ hasText: "Sage Nomad #009" });
    await expect(ordered.locator("output")).toHaveText("2");

    await app.mocks("resolveOrder", orderId, "confirmed");

    // sai 1 unidade de Sage Nomad (a comprada); o restante fica
    await expect(ordered.locator("output")).toHaveText("1");
    await expect(app.cartLines().filter({ hasText: "Golden Beat #207" })).toHaveCount(1);
    await expect(app.cartLines()).toHaveCount(2);
  });

  test("pedido pendente: confirmar de novo no pagamento não cria uma segunda compra", async ({ app, page }) => {
    await app.open("/", "pedido-pendente");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    const orderId = app.orderId();

    // o carrinho ainda tem os itens: o usuário volta ao pagamento e confirma outra vez
    await app.open("/pagamento");
    await app.connectWallet();
    await app.confirmButton().click();

    await expect(page.getByText("Você já tem um pedido aguardando confirmação.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/pedidos/${orderId}$`));
    await expect(app.order("pending")).toBeVisible();
    expect(await app.ordersOnServer()).toHaveLength(1);
  });

  test("pedido inexistente e pedido de outra conta têm mensagens próprias", async ({ app, page }) => {
    await app.open("/", "pedido-pendente");
    await app.addToCart();
    await app.goToCheckout();
    await app.confirmButton().click();
    await expect(app.order("pending")).toBeVisible();
    const orderPath = app.path();

    await app.open("/pedidos/ord_9999");
    await expect(page.getByRole("heading", { level: 1, name: "Pedido não encontrado" })).toBeVisible();

    await page.getByRole("button", { name: /abrir menu da conta/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await app.open(orderPath);
    await app.fillLogin({ email: "nova@kurio.test", password: "Kurio@456" });
    await expect(page.getByRole("heading", { level: 1, name: "Este pedido pertence a outra conta" })).toBeVisible();
  });
});
