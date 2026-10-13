import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateOrderRequest } from "@/api/contracts";
import { clearOrderAttempt, idempotencyKeyFor } from "@/features/checkout/order-attempt";

const body = (overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest => ({
  quoteHash: "a1b2c3d4",
  walletId: "wal_1",
  provider: "metamask",
  network: "ethereum",
  collector: {
    displayName: "Nova Sato",
    username: "nova.sato",
    profileName: "Nova Sato",
    email: "colecionador@kurio.test",
    referralCode: "KURIO2026",
    ensName: "nova.kurio.eth",
    note: "",
  },
  ...overrides,
});

/** sessionStorage mínimo, em memória. */
function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("chave de idempotência do pedido", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: fakeStorage() });
  });

  it("a mesma tentativa (mesmo corpo) reusa a mesma chave", () => {
    const first = idempotencyKeyFor(body());
    expect(idempotencyKeyFor(body())).toBe(first);
    expect(idempotencyKeyFor(body())).toBe(first);
  });

  it("corpo diferente é outra tentativa e recebe outra chave", () => {
    const first = idempotencyKeyFor(body());
    expect(idempotencyKeyFor(body({ quoteHash: "ffffffff" }))).not.toBe(first);
    expect(idempotencyKeyFor(body({ walletId: "wal_2" }))).not.toBe(first);
  });

  it("voltar ao corpo anterior depois de mudar gera chave nova (só a última tentativa é lembrada)", () => {
    const first = idempotencyKeyFor(body());
    idempotencyKeyFor(body({ network: "polygon" }));
    expect(idempotencyKeyFor(body())).not.toBe(first);
  });

  it("depois de concluída, uma compra idêntica é outro pedido", () => {
    const first = idempotencyKeyFor(body());
    clearOrderAttempt();
    expect(idempotencyKeyFor(body())).not.toBe(first);
  });

  it("ignora valor corrompido no armazenamento", () => {
    window.sessionStorage.setItem("kurio.checkout.attempt", "{isto não é json");
    expect(idempotencyKeyFor(body())).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sem armazenamento disponível, ainda devolve uma chave", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => {
          throw new Error("bloqueado");
        },
        setItem: () => {
          throw new Error("bloqueado");
        },
        removeItem: () => {
          throw new Error("bloqueado");
        },
      },
    });
    expect(idempotencyKeyFor(body())).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => clearOrderAttempt()).not.toThrow();
  });
});
