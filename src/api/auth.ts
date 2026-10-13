import type { LoginRequest, RegisterRequest, Session } from "@/api/contracts";
import { http, type RequestOptions } from "@/lib/http";

// cria uma conta e já devolve a sessão
export async function register(body: RegisterRequest) {
  const { data } = await http.post<Session>("/auth/register", body);
  return data;
}

// entra com e-mail e senha
export async function login(body: LoginRequest) {
  const { data } = await http.post<Session>("/auth/login", body);
  return data;
}

/** Recupera a sessão a partir do token guardado (refresh da página). */
export async function getSession(options?: RequestOptions) {
  const { data } = await http.get<Session>("/auth/session", options);
  return data;
}

// encerra a sessão no servidor
export async function logout() {
  await http.post("/auth/logout");
}
