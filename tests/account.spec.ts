import { expect, test, USERS } from "./support/app";

// PNG 1×1 válido, para o envio de avatar
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Perfil e carteiras", () => {
  test("perfil: erro da API no campo, edição persistida após o refresh", async ({ app, page }) => {
    await app.loginAndOpen("/conta/perfil");
    const save = page.getByRole("button", { name: "Salvar", exact: true });

    // validação local
    await page.getByLabel("Nome de exibição").fill("");
    await save.click();
    await expect(page.getByText("Informe o nome de exibição.")).toBeVisible();

    // conflito devolvido pela API (o nome pertence ao outro usuário das fixtures)
    await page.getByLabel("Nome de exibição").fill("Nova S. Editada");
    await page.getByLabel("Nome de usuário").fill("iris.okafor");
    await save.click();
    await expect(page.getByText("Este nome de usuário já está em uso.")).toBeVisible();
    await expect(page.getByLabel("Nome de usuário")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Nome de usuário").fill("nova.sato");
    await save.click();
    await expect(page.getByText("Perfil atualizado.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nova S. Editada");
  });

  test("avatar: arquivo inválido é recusado; imagem válida é salva e pode ser removida", async ({ app, page }) => {
    await app.loginAndOpen("/conta/perfil");
    const input = page.getByLabel("Arquivo do avatar");

    await input.setInputFiles({ name: "documento.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByText("Envie uma imagem PNG, JPEG ou WebP.")).toBeVisible();

    await input.setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Avatar atualizado.")).toBeVisible();
    await expect(page.getByRole("img", { name: /Avatar de/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("img", { name: /Avatar de/ })).toBeVisible();

    await page.getByRole("button", { name: "Remover" }).click();
    await expect(page.getByText("Avatar removido.")).toBeVisible();
    await expect(page.getByRole("img", { name: /Avatar de/ })).toHaveCount(0);
  });

  test("senha: confirmação diferente, senha atual incorreta e troca efetiva", async ({ app, page }) => {
    await app.loginAndOpen("/conta/perfil");
    const change = page.getByRole("button", { name: "Salvar", exact: true });

    await page.getByLabel("Senha atual").fill("errada12345");
    await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha1");
    await page.getByLabel("Confirmar nova senha").fill("NovaSenha2");
    await change.click();
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();

    await page.getByLabel("Confirmar nova senha").fill("NovaSenha1");
    await change.click();
    await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();

    await page.getByLabel("Senha atual").fill(USERS.collector.password);
    await change.click();
    await expect(page.getByText("Senha alterada.")).toBeVisible();

    // a senha antiga deixa de valer; a nova entra
    await page.getByRole("button", { name: /abrir menu da conta/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await app.open("/entrar");
    await app.fillLogin(USERS.collector);
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
    await app.login({ email: USERS.collector.email, password: "NovaSenha1" });
    await expect(page.getByRole("button", { name: /abrir menu da conta/ })).toBeVisible();
  });

  test("carteiras: validação do endereço e edição persistida", async ({ app, page }) => {
    await app.loginAndOpen("/conta/carteiras");
    const primary = page.getByRole("form", { name: "Carteira principal" });

    await primary.getByLabel("Endereço da carteira").fill("0x123");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Informe um endereço 0x com 40 caracteres hexadecimais.")).toBeVisible();

    // regra da API: o endereço não pode repetir o da carteira secundária
    await primary.getByLabel("Endereço da carteira").fill("0x7A42b1C3d5E7f9A0b2C4d6E8f0A1b3C5d7E919E8");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Este endereço já está cadastrado em outra carteira.")).toBeVisible();

    await primary.getByLabel("Endereço da carteira").fill("0xA91F3c5B7e2D4a6F8b0C1d2E3f4A5b6C7d8EE82C");
    await primary.getByLabel("Apelido da carteira").fill("Cofre");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira principal atualizada.")).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("form", { name: "Carteira principal" }).getByLabel("Apelido da carteira"),
    ).toHaveValue("Cofre");
  });

  test("conta nova cadastra a carteira principal e a secundária", async ({ app, page }) => {
    await app.loginAndOpen("/conta/carteiras", USERS.other);
    await expect(page.getByText("Você ainda não adicionou uma carteira principal.")).toBeVisible();

    await page.getByRole("button", { name: "Adicionar" }).first().click();
    const primary = page.getByRole("form", { name: "Carteira principal" });
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(primary.getByRole("alert").first()).toBeVisible();

    await primary.getByLabel("Nome de exibição").fill("Iris Okafor");
    await primary.getByLabel("Apelido da carteira").fill("Principal");
    await primary.getByLabel("Rede").selectOption("ethereum");
    await primary.getByLabel("Nome do perfil").fill("Iris");
    await primary.getByLabel("Endereço da carteira").fill("0x1111111111111111111111111111111111111111");
    await primary.getByLabel("Tipo de carteira").selectOption("metamask");
    await primary.getByLabel("Código de indicação").fill("IRIS2026");
    await primary.getByLabel("E-mail").fill(USERS.other.email);
    await primary.getByLabel("Nome ENS").fill("iris");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira principal cadastrada.")).toBeVisible();

    // "igual à principal" pré-preenche a secundária; o endereço precisa ser outro
    await page.getByRole("checkbox", { name: "Igual à carteira principal" }).check();
    await page.getByRole("button", { name: "Adicionar" }).click();
    const secondary = page.getByRole("form", { name: "Carteira secundária" });
    await expect(secondary.getByLabel("Nome do perfil")).toHaveValue("Iris");
    await secondary.getByLabel("Apelido da carteira").fill("Reserva");
    await secondary.getByLabel("Endereço da carteira").fill("0x2222222222222222222222222222222222222222");
    await secondary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira secundária cadastrada.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("form")).toHaveCount(2);
  });
});
