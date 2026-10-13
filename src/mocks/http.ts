/**
 * Utilitários dos handlers REST: injeção de latência e falhas, respostas de
 * erro no formato do contrato, validação de corpo e autenticação.
 */
import { delay, http, HttpResponse } from "msw";
import type { z } from "zod";
import type { ApiErrorBody, ApiErrorCode } from "@/api/contracts";
import { env } from "@/lib/env";
import { nextLatency, takeFault, type FaultRule } from "@/mocks/config";
import { commit, db } from "@/mocks/db";
import type { DbSession, DbUser } from "@/mocks/types";

/** Erro de negócio lançado pelos handlers; vira a resposta HTTP correspondente. */
export class MockError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.body = body;
  }
}

// interrompe o handler com um erro da API
export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: Pick<ApiErrorBody, "fields" | "details"> = {},
): never {
  throw new MockError(status, { code, message, ...extra });
}

// resposta JSON
export function json<T>(body: T, status = 200) {
  return HttpResponse.json(body as Parameters<typeof HttpResponse.json>[0], { status });
}

// resposta 204
export function noContent() {
  return new HttpResponse(null, { status: 204 });
}

// mensagens das falhas injetadas
const FAULT_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  INTERNAL_ERROR: "Erro interno do servidor. Tente novamente.",
  SERVICE_UNAVAILABLE: "Serviço temporariamente indisponível. Tente novamente em instantes.",
};

// resposta de uma falha injetada
async function faultResponse(fault: FaultRule) {
  if (fault.kind === "network") return HttpResponse.error();
  if (fault.kind === "timeout") {
    // a resposta nunca chega: quem encerra a espera é o timeout do cliente
    await delay("infinite");
    return HttpResponse.error();
  }
  const code = fault.code ?? "INTERNAL_ERROR";
  return json<ApiErrorBody>(
    { code, message: fault.message ?? FAULT_MESSAGES[code] ?? "Não foi possível concluir a operação." },
    fault.status ?? 500,
  );
}

type Method = "get" | "post" | "put" | "patch" | "delete";

type RouteContext = {
  request: Request;
  params: Record<string, string>;
  url: URL;
};

type Resolver = (context: RouteContext) => Promise<Response> | Response;

// prefixo das rotas da API
const apiPrefix = new URL(env.apiUrl, window.location.origin).pathname.replace(/\/$/, "");

/**
 * Registra uma rota da API. Toda requisição passa pelo mesmo caminho:
 * latência do cenário → falha injetada (antes ou depois do handler) → handler.
 */
export function route(method: Method, path: string, resolver: Resolver) {
  return http[method](`${env.apiUrl}${path}`, async ({ request, params }) => {
    const url = new URL(request.url);
    const verb = method.toUpperCase();
    const requestPath = url.pathname.slice(apiPrefix.length);

    await delay(nextLatency(verb, requestPath));

    const fault = takeFault(verb, requestPath);
    if (fault && fault.phase !== "after") return faultResponse(fault);

    let response: Response;
    try {
      response = await resolver({ request, params: params as Record<string, string>, url });
    } catch (error) {
      if (!(error instanceof MockError)) throw error;
      response = json(error.body, error.status);
    }

    // falha "after": o efeito do handler já aconteceu, mas o cliente não fica sabendo
    if (fault) return faultResponse(fault);
    return response;
  });
}

/** Lê e valida o corpo JSON; erros viram 422 com a mensagem de cada campo. */
export async function readBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    fail(422, "VALIDATION_ERROR", "O corpo da requisição não é um JSON válido.");
  }

  const result = schema.safeParse(payload);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fail(422, "VALIDATION_ERROR", "Revise os campos destacados.", { fields });
}

// token do cabeçalho Authorization
function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

type Authenticated = { user: DbUser; session: DbSession };

/** Sessão da requisição, ou null se não há token. Token inválido ou vencido lança 401. */
export function authenticate(request: Request): Authenticated | null {
  const token = bearerToken(request);
  if (!token) return null;

  const current = db();
  const session = current.sessions.find((item) => item.token === token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) {
      current.sessions = current.sessions.filter((item) => item.token !== token);
      commit();
    }
    fail(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para continuar.");
  }

  const user = current.users.find((item) => item.id === session.userId);
  if (!user) fail(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para continuar.");
  return { user, session };
}

// exige usuário autenticado
export function requireUser(request: Request): DbUser {
  const auth = authenticate(request);
  if (!auth) fail(401, "UNAUTHENTICATED", "Entre na sua conta para continuar.");
  return auth.user;
}

/** Dono do carrinho: o usuário autenticado ou o identificador de visitante. */
export function cartOwner(request: Request): { key: string; user: DbUser | null } {
  const auth = authenticate(request);
  if (auth) return { key: auth.user.id, user: auth.user };

  const guestId = request.headers.get("X-Cart-Id");
  if (!guestId || !/^guest_[\w-]{8,}$/.test(guestId)) {
    fail(422, "VALIDATION_ERROR", "Identificador de carrinho ausente ou inválido.");
  }
  return { key: guestId, user: null };
}
