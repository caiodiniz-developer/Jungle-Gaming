import { z } from "zod";
import type { Session } from "@/api/contracts";
import { loginSchema, registerSchema } from "@/api/schemas";
import { getConfig } from "@/mocks/config";
import { commit, db, hashPassword, nextId, randomHex, toPublicUser } from "@/mocks/db";
import { mergeGuestCart } from "@/mocks/domain/pricing";
import { authenticate, fail, json, noContent, readBody, route } from "@/mocks/http";
import type { DbUser } from "@/mocks/types";

// campo opcional com o carrinho do visitante
const guestCart = { guestCartId: z.string().optional() };

// abre uma sessão para o usuário
function openSession(user: DbUser): Session {
  const current = db();
  const expiresAt = Date.now() + getConfig().sessionTtlMs;
  const token = randomHex(24);
  current.sessions.push({ token, userId: user.id, expiresAt });
  commit();
  return { token, expiresAt: new Date(expiresAt).toISOString(), user: toPublicUser(user) };
}

// rotas de cadastro, login, sessão e logout
export const authHandlers = [
  route("post", "/auth/register", async ({ request }) => {
    const body = await readBody(request, registerSchema.extend(guestCart));
    const current = db();
    const email = body.email.toLowerCase();

    if (current.users.some((user) => user.email.toLowerCase() === email)) {
      fail(409, "EMAIL_TAKEN", "Já existe uma conta com este e-mail.", {
        fields: { email: "Este e-mail já está cadastrado." },
      });
    }
    if (current.users.some((user) => user.username.toLowerCase() === body.username.toLowerCase())) {
      fail(409, "USERNAME_TAKEN", "Este nome de usuário já está em uso.", {
        fields: { username: "Este nome de usuário já está em uso." },
      });
    }

    const passwordSalt = randomHex(16);
    const user: DbUser = {
      id: nextId("user", "usr"),
      email,
      username: body.username,
      displayName: body.username,
      ensName: "",
      walletAlias: "",
      avatarUrl: null,
      passwordSalt,
      passwordHash: await hashPassword(body.password, passwordSalt),
    };
    current.users.push(user);
    mergeGuestCart(body.guestCartId, user.id);
    return json(openSession(user), 201);
  }),

  route("post", "/auth/login", async ({ request }) => {
    const body = await readBody(request, loginSchema.extend(guestCart));
    const user = db().users.find((item) => item.email.toLowerCase() === body.email.toLowerCase());
    const valid = user && (await hashPassword(body.password, user.passwordSalt)) === user.passwordHash;
    if (!user || !valid) {
      // mesma resposta para e-mail inexistente e senha errada: não revela quais contas existem
      fail(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    }
    mergeGuestCart(body.guestCartId, user.id);
    return json(openSession(user));
  }),

  route("get", "/auth/session", ({ request }) => {
    const auth = authenticate(request);
    if (!auth) fail(401, "UNAUTHENTICATED", "Entre na sua conta para continuar.");
    return json<Session>({
      token: auth.session.token,
      expiresAt: new Date(auth.session.expiresAt).toISOString(),
      user: toPublicUser(auth.user),
    });
  }),

  route("post", "/auth/logout", ({ request }) => {
    const header = request.headers.get("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const current = db();
      const session = current.sessions.find((item) => item.token === token);
      if (session) delete current.walletConnections[session.userId];
      current.sessions = current.sessions.filter((item) => item.token !== token);
      commit();
    }
    // sair é sempre bem-sucedido, mesmo com sessão já vencida
    return noContent();
  }),
];
