/**
 * Credenciais de transporte guardadas no navegador:
 * o token da sessão e o identificador do carrinho de visitante.
 * Só o token é persistido — a senha nunca é armazenada.
 */

const TOKEN_KEY = "kurio.session.token";
const GUEST_CART_KEY = "kurio.cart.guest-id";

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // armazenamento bloqueado (modo privado restrito)
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // sem persistência: a sessão vale só enquanto a aba estiver aberta
  }
}

let currentToken = read(TOKEN_KEY);

export function getSessionToken(): string | null {
  return currentToken;
}

export function setSessionToken(token: string | null) {
  if (token === currentToken) return;
  currentToken = token;
  write(TOKEN_KEY, token);
  for (const listener of listeners) listener(token);
}

/** Notifica mudanças de token, inclusive as feitas em outra aba. */
export function subscribeSessionToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== TOKEN_KEY || event.newValue === currentToken) return;
    currentToken = event.newValue;
    for (const listener of listeners) listener(currentToken);
  });
}

/** Identificador estável do carrinho de quem ainda não entrou. */
export function getGuestCartId(): string {
  const existing = read(GUEST_CART_KEY);
  if (existing) return existing;
  const created = `guest_${crypto.randomUUID()}`;
  write(GUEST_CART_KEY, created);
  return created;
}

/** Após o login o carrinho do visitante é incorporado à conta e o identificador é trocado. */
export function resetGuestCartId() {
  write(GUEST_CART_KEY, null);
}
