import { redirect } from "@tanstack/react-router";
import { getSessionToken } from "@/lib/session-storage";

/** Rotas que exigem conta: checkout, pedidos e área do colecionador. */
export const PROTECTED_PATHS = ["/conta", "/pagamento", "/pedidos"];

// diz se a rota exige login
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * `beforeLoad` das rotas privadas: sem sessão, leva ao login guardando o
 * destino, para retomar o fluxo depois de entrar. Um token inválido ou vencido
 * é detectado pela primeira chamada à API (401), tratada em SessionWatcher.
 */
export function requireSession({ location }: { location: { href: string } }) {
  if (getSessionToken() === null) {
    throw redirect({ to: "/entrar", search: { redirect: location.href }, replace: true });
  }
}

/** Aceita apenas caminhos internos como destino pós-login (evita redirecionamento aberto). */
export function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/";
  if (target.startsWith("/entrar") || target.startsWith("/cadastro")) return "/";
  return target;
}

/** `beforeLoad` de /entrar e /cadastro: quem já tem sessão segue direto para o destino. */
export function redirectIfSignedIn({ search }: { search: { redirect?: string } }) {
  if (getSessionToken() !== null) {
    throw redirect({ href: safeRedirect(search.redirect), replace: true });
  }
}
