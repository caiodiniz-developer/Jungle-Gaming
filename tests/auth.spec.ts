import { expect, test, USERS } from "./support/app";

const accountMenu = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /abrir menu da conta/ });

test.describe("Conta e sessão", () => {
  test("rota privada pede login, valida os campos e devolve ao destino", async ({ app, page }) => {
    await app.open("/conta/perfil");
    await expect(page).toHaveURL(/\/entrar\?redirect=/);

    // validação local
    await app.authScope().getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByText("Informe o e-mail.")).toBeVisible();
    await expect(page.getByText("Informe a senha.")).toBeVisible();

    // erro devolvido pela API
    await app.fillLogin({ email: USERS.collector.email, password: "senha-errada1" });
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

    await app.login();
    await expect(page).toHaveURL(/\/conta\/perfil/);
    await expect(page.getByLabel("Nome de exibição")).toHaveValue(USERS.collector.name);

    // a sessão é recuperada após o refresh
    await page.reload();
    await expect(page.getByLabel("Nome de exibição")).toHaveValue(USERS.collector.name);
    await expect(accountMenu(page)).toContainText(USERS.collector.name);
  });

  test("cadastro: validação, conflito de e-mail e criação da conta", async ({ app, page }) => {
    await app.open("/cadastro");
    const dialog = app.authScope();

    await dialog.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("O nome de usuário deve ter ao menos 3 caracteres.")).toBeVisible();

    await dialog.getByRole("textbox", { name: "Nome de usuário" }).fill("novo.colecionador");
    await dialog.getByRole("textbox", { name: "E-mail" }).fill(USERS.other.email);
    await dialog.getByRole("textbox", { name: "Senha", exact: true }).fill("Senha1234");
    await dialog.getByRole("textbox", { name: "Confirmar senha" }).fill("Senha12345");
    await dialog.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();

    await dialog.getByRole("textbox", { name: "Confirmar senha" }).fill("Senha1234");
    await dialog.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Este e-mail já está cadastrado.")).toBeVisible();

    await dialog.getByRole("textbox", { name: "E-mail" }).fill("novo@kurio.test");
    await dialog.getByRole("button", { name: "Criar conta" }).click();
    await expect(accountMenu(page)).toContainText("novo.colecionador");

    // a conta criada existe na API: sair e entrar de novo funciona
    await accountMenu(page).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await page.getByRole("link", { name: "Entrar" }).click();
    await app.login({ email: "novo@kurio.test", password: "Senha1234" });
    await expect(accountMenu(page)).toContainText("novo.colecionador");
  });

  test("sessão expirada durante a navegação leva ao login e retoma a tela", async ({ app, page }) => {
    await app.loginAndOpen("/conta/perfil");
    await page.getByLabel("Nome de exibição").fill("Outro nome");

    await app.mocks("expireSessions");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(page).toHaveURL(/\/entrar\?redirect=/);
    await expect(page.getByText("Sua sessão expirou.")).toBeVisible();
    await app.login();
    await expect(page).toHaveURL(/\/conta\/perfil/);
  });

  test("cenário de expiração por tempo: a sessão vence 20 s após o login (relógio controlado)", async ({
    app,
    page,
  }) => {
    await page.clock.install();
    await app.open("/entrar?redirect=/conta/perfil", "sessao-expirada");
    await app.login();
    await expect(page.getByLabel("Nome de exibição")).toHaveValue(USERS.collector.name);

    await page.clock.fastForward(21_000);
    await page.getByLabel("Nome de exibição").fill("Depois do prazo");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page).toHaveURL(/\/entrar\?redirect=/);
    await expect(page.getByText("Sua sessão expirou.")).toBeVisible();
  });

  test("logout e troca de usuário não deixam dados da conta anterior", async ({ app, page }) => {
    // a conta A tem Sage Nomad #009 entre os favoritos e um item no carrinho
    await app.loginAndOpen("/nft/nft-0009");
    await expect(page.getByRole("button", { name: "Remover Sage Nomad #009 dos favoritos" })).toBeVisible();
    await page.getByRole("button", { name: "COMPRAR" }).click();
    await expect(app.cartLines()).toHaveCount(1);

    await accountMenu(page).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
    // o carrinho da conta não aparece para o visitante
    await expect(page.getByRole("link", { name: "Carrinho", exact: true })).toBeVisible();

    // rota privada volta a pedir login
    await app.open("/conta/carteiras");
    await expect(page).toHaveURL(/\/entrar/);

    await app.login(USERS.other);
    await expect(page.getByText("Você ainda não adicionou uma carteira principal.")).toBeVisible();
    await app.open("/nft/nft-0009");
    await expect(page.getByRole("button", { name: "Favoritar Sage Nomad #009" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await app.open("/carrinho");
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });
});
