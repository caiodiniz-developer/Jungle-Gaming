/**
 * Regras de validação dos corpos de requisição.
 * São usadas nos formulários (react-hook-form) e nos handlers MSW, de modo que
 * a interface e a API simulada rejeitem exatamente os mesmos dados.
 */
import { z } from "zod";

// redes aceitas
const NETWORKS = ["ethereum", "polygon", "solana"] as const;
// tipos de carteira aceitos
const PROVIDERS = ["metamask", "walletconnect", "coinbase"] as const;

// campo de texto obrigatório
const required = (label: string) => z.string().trim().min(1, `Informe ${label}.`);

// validação de e-mail
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail.")
  .pipe(z.email("Informe um e-mail válido."));

// validação do nome de usuário
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "O nome de usuário deve ter ao menos 3 caracteres.")
  .max(20, "O nome de usuário deve ter no máximo 20 caracteres.")
  .regex(/^[a-zA-Z0-9_.]+$/, "Use apenas letras, números, ponto e sublinhado.");

// validação de senha (8+ caracteres, letra e número)
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra.")
  .regex(/\d/, "A senha deve conter ao menos um número.");

// validação do nome ENS (termina em .eth)
export const ensNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/, "Informe um nome ENS válido, como nome.eth.");

// validação do endereço 0x da carteira
export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Informe um endereço 0x com 40 caracteres hexadecimais.");

// ───────────── Sessão ─────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha."),
});

// corpo do cadastro
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// formulário de cadastro (inclui confirmar senha)
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, "Confirme a senha.") })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

// ───────────── Perfil ─────────────

export const profileSchema = z.object({
  displayName: required("o nome de exibição").max(40, "Use no máximo 40 caracteres."),
  username: usernameSchema,
  email: emailSchema,
  ensName: ensNameSchema,
  walletAlias: required("o apelido da carteira").max(30, "Use no máximo 30 caracteres."),
});

// corpo da troca de senha
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: passwordSchema,
});

// formulário de troca de senha (inclui confirmação)
export const changePasswordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string().min(1, "Confirme a nova senha.") })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha deve ser diferente da atual.",
  });

/** Limite do avatar: ~200 KB de imagem (data URL em base64 ocupa ~4/3 disso). */
export const AVATAR_MAX_BYTES = 200 * 1024;

// validação do avatar (tipo e tamanho)
export const avatarSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, "Envie uma imagem PNG, JPEG ou WebP.")
    .max(Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 64, "A imagem deve ter no máximo 200 KB."),
});

// ───────────── Carteiras ─────────────

export const walletSchema = z.object({
  kind: z.enum(["primary", "secondary"]),
  displayName: required("o nome de exibição").max(40, "Use no máximo 40 caracteres."),
  alias: required("o apelido da carteira").max(30, "Use no máximo 30 caracteres."),
  network: z.enum(NETWORKS, "Selecione uma rede."),
  profileName: required("o nome do perfil").max(40, "Use no máximo 40 caracteres."),
  address: walletAddressSchema,
  secondaryAddress: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || /^0x[a-fA-F0-9]{40}$/.test(value) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(value),
      "Informe um endereço 0x ou um nome ENS.",
    ),
  provider: z.enum(PROVIDERS, "Selecione uma carteira."),
  referralCode: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9]{4,12}$/, "O código deve ter de 4 a 12 letras ou números."),
  email: emailSchema,
  ensName: ensNameSchema,
});

// corpo do pedido de conexão da carteira
export const connectWalletSchema = z.object({
  provider: z.enum(PROVIDERS, "Selecione uma carteira."),
  network: z.enum(NETWORKS, "Selecione uma rede."),
});

// ───────────── Carrinho e pedido ─────────────

export const addCartItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: z.number().int("A quantidade deve ser inteira.").min(1, "A quantidade mínima é 1."),
});

// corpo da alteração de quantidade
export const updateCartItemSchema = z.object({
  quantity: z.number().int("A quantidade deve ser inteira.").min(1, "A quantidade mínima é 1."),
});

// validação do código promocional
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Digite o código promocional.")
    .max(20, "O código deve ter no máximo 20 caracteres."),
});

// dados do colecionador no pagamento
export const collectorSchema = z.object({
  displayName: required("o nome de exibição").max(40, "Use no máximo 40 caracteres."),
  username: usernameSchema,
  profileName: required("o nome do perfil").max(40, "Use no máximo 40 caracteres."),
  email: emailSchema,
  referralCode: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9]{4,12}$/, "O código deve ter de 4 a 12 letras ou números."),
  ensName: ensNameSchema,
  note: z.string().trim().max(280, "Use no máximo 280 caracteres."),
});

// corpo da criação do pedido
export const createOrderSchema = z.object({
  quoteHash: z.string().min(1),
  walletId: z.string().min(1, "Selecione uma carteira."),
  provider: z.enum(PROVIDERS, "Selecione uma carteira."),
  network: z.enum(NETWORKS, "Selecione uma rede."),
  collector: collectorSchema,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
export type WalletValues = z.infer<typeof walletSchema>;
export type CollectorValues = z.infer<typeof collectorSchema>;
