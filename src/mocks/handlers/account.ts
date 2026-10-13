import type { Wallet, WalletConnection } from "@/api/contracts";
import {
  avatarSchema,
  changePasswordSchema,
  connectWalletSchema,
  profileSchema,
  walletSchema,
  type WalletValues,
} from "@/api/schemas";
import { getConfig } from "@/mocks/config";
import { commit, db, hashPassword, nextId, randomHex, toPublicUser } from "@/mocks/db";
import { fail, json, noContent, readBody, requireUser, route } from "@/mocks/http";

// carteiras de um usuário
function walletsOf(userId: string): Wallet[] {
  const wallets = db().wallets;
  wallets[userId] ??= [];
  return wallets[userId];
}

/** Regras entre carteiras do mesmo usuário: uma por tipo e endereços distintos. */
function assertWalletRules(userId: string, body: WalletValues, ignoreId?: string) {
  const others = walletsOf(userId).filter((wallet) => wallet.id !== ignoreId);
  if (others.some((wallet) => wallet.kind === body.kind)) {
    const label = body.kind === "primary" ? "principal" : "secundária";
    fail(422, "VALIDATION_ERROR", `Você já possui uma carteira ${label}.`, {
      fields: { kind: `Você já possui uma carteira ${label}.` },
    });
  }
  if (others.some((wallet) => wallet.address.toLowerCase() === body.address.toLowerCase())) {
    fail(422, "VALIDATION_ERROR", "Este endereço já está cadastrado em outra carteira.", {
      fields: { address: "Este endereço já está cadastrado em outra carteira." },
    });
  }
}

/** Localiza a carteira do usuário; distingue "não existe" de "é de outra conta". */
function findOwnWallet(userId: string, walletId: string): Wallet {
  const own = walletsOf(userId).find((wallet) => wallet.id === walletId);
  if (own) return own;
  const exists = Object.values(db().wallets).some((list) =>
    list.some((wallet) => wallet.id === walletId),
  );
  if (exists) fail(403, "FORBIDDEN", "Esta carteira pertence a outra conta.");
  return fail(404, "NOT_FOUND", "Carteira não encontrada.");
}

// rotas de perfil e carteiras
export const accountHandlers = [
  // ───────────── Perfil ─────────────

  route("get", "/profile", ({ request }) => json(toPublicUser(requireUser(request)))),

  route("patch", "/profile", async ({ request }) => {
    const user = requireUser(request);
    const body = await readBody(request, profileSchema);
    const others = db().users.filter((item) => item.id !== user.id);
    const email = body.email.toLowerCase();

    if (others.some((item) => item.email.toLowerCase() === email)) {
      fail(409, "EMAIL_TAKEN", "Este e-mail já está em uso por outra conta.", {
        fields: { email: "Este e-mail já está em uso por outra conta." },
      });
    }
    if (others.some((item) => item.username.toLowerCase() === body.username.toLowerCase())) {
      fail(409, "USERNAME_TAKEN", "Este nome de usuário já está em uso.", {
        fields: { username: "Este nome de usuário já está em uso." },
      });
    }

    Object.assign(user, { ...body, email });
    commit();
    return json(toPublicUser(user));
  }),

  route("put", "/profile/avatar", async ({ request }) => {
    const user = requireUser(request);
    const body = await readBody(request, avatarSchema);
    user.avatarUrl = body.dataUrl;
    commit();
    return json(toPublicUser(user));
  }),

  route("delete", "/profile/avatar", ({ request }) => {
    const user = requireUser(request);
    user.avatarUrl = null;
    commit();
    return json(toPublicUser(user));
  }),

  route("put", "/profile/password", async ({ request }) => {
    const user = requireUser(request);
    const body = await readBody(request, changePasswordSchema);

    if ((await hashPassword(body.currentPassword, user.passwordSalt)) !== user.passwordHash) {
      fail(422, "VALIDATION_ERROR", "A senha atual está incorreta.", {
        fields: { currentPassword: "A senha atual está incorreta." },
      });
    }

    user.passwordSalt = randomHex(16);
    user.passwordHash = await hashPassword(body.newPassword, user.passwordSalt);
    commit();
    return noContent();
  }),

  // ───────────── Carteiras ─────────────

  route("get", "/wallets", ({ request }) => json(walletsOf(requireUser(request).id))),

  route("post", "/wallets", async ({ request }) => {
    const user = requireUser(request);
    const body = await readBody(request, walletSchema);
    assertWalletRules(user.id, body);

    const now = new Date().toISOString();
    const wallet: Wallet = { ...body, id: nextId("wallet", "wal"), createdAt: now, updatedAt: now };
    walletsOf(user.id).push(wallet);
    commit();
    return json(wallet, 201);
  }),

  route("put", "/wallets/:walletId", async ({ request, params }) => {
    const user = requireUser(request);
    const wallet = findOwnWallet(user.id, params.walletId ?? "");
    const body = await readBody(request, walletSchema);
    assertWalletRules(user.id, body, wallet.id);

    Object.assign(wallet, body, { updatedAt: new Date().toISOString() });
    commit();
    return json(wallet);
  }),

  route("post", "/wallets/:walletId/connection", async ({ request, params }) => {
    const user = requireUser(request);
    const wallet = findOwnWallet(user.id, params.walletId ?? "");
    const body = await readBody(request, connectWalletSchema);

    if (getConfig().walletRefuses) {
      fail(403, "WALLET_REJECTED", "A conexão foi recusada na carteira.");
    }

    const connection: WalletConnection = {
      walletId: wallet.id,
      provider: body.provider,
      network: body.network,
      connectedAt: new Date().toISOString(),
    };
    db().walletConnections[user.id] = connection;
    commit();
    return json(connection, 201);
  }),

  route("delete", "/wallets/:walletId/connection", ({ request, params }) => {
    const user = requireUser(request);
    const current = db();
    if (current.walletConnections[user.id]?.walletId === params.walletId) {
      delete current.walletConnections[user.id];
      commit();
    }
    return noContent();
  }),
];
