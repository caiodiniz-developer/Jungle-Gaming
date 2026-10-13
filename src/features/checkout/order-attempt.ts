import type { CreateOrderRequest } from "@/api/contracts";

/**
 * Chave de idempotência da tentativa de compra.
 *
 * Uma tentativa é identificada pelo conteúdo do pedido: enquanto o corpo for o
 * mesmo (clique repetido, nova tentativa após timeout ou falha de rede, refresh
 * da página), a mesma chave é reenviada e a API devolve o pedido já criado em
 * vez de criar outro. Se o corpo mudar — nova cotação, outra carteira —, é uma
 * nova tentativa e recebe uma nova chave.
 *
 * Fica em sessionStorage para sobreviver ao refresh sem vazar para outras abas.
 */
const STORAGE_KEY = "kurio.checkout.attempt";

type StoredAttempt = { key: string; body: string };

// lê a tentativa guardada
function read(): StoredAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAttempt>;
    return typeof parsed.key === "string" && typeof parsed.body === "string"
      ? { key: parsed.key, body: parsed.body }
      : null;
  } catch {
    return null;
  }
}

// chave de idempotência para este corpo de pedido
export function idempotencyKeyFor(body: CreateOrderRequest): string {
  const serialized = JSON.stringify(body);
  const stored = read();
  if (stored?.body === serialized) return stored.key;

  const key = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ key, body: serialized }));
  } catch {
    // sem sessionStorage a chave vale só para esta chamada
  }
  return key;
}

/** Encerrada a tentativa (pedido criado), uma compra futura idêntica deve gerar outro pedido. */
export function clearOrderAttempt() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada a limpar
  }
}
