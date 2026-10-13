import { describe, expect, it } from "vitest";
import type { RealtimeEnvelope } from "@/api/contracts";
import { createEventGate } from "@/realtime/events";

type Event = RealtimeEnvelope<"nft.updated" | "order.updated", unknown>;

const event = (overrides: Partial<Event> = {}): Event => ({
  id: "evt_1",
  type: "nft.updated",
  resource: { type: "nft", id: "nft-0009" },
  version: 2,
  occurredAt: "2026-10-13T12:00:00.000Z",
  data: null,
  ...overrides,
});

describe("filtro de eventos em tempo real", () => {
  it("aceita um evento novo", () => {
    expect(createEventGate().accept(event())).toBe(true);
  });

  it("descarta a reentrega do mesmo evento (mesmo id)", () => {
    const gate = createEventGate();
    expect(gate.accept(event())).toBe(true);
    expect(gate.accept(event())).toBe(false);
  });

  it("descarta evento com versão igual ou anterior à já aplicada", () => {
    const gate = createEventGate();
    gate.accept(event({ id: "a", version: 5 }));
    expect(gate.accept(event({ id: "b", version: 4 }))).toBe(false);
    expect(gate.accept(event({ id: "c", version: 5 }))).toBe(false);
    expect(gate.accept(event({ id: "d", version: 6 }))).toBe(true);
  });

  it("controla a versão por recurso, não globalmente", () => {
    const gate = createEventGate();
    gate.accept(event({ id: "a", version: 9 }));
    const other = { type: "nft", id: "nft-0042" } as const;
    expect(gate.accept(event({ id: "b", version: 1, resource: other }))).toBe(true);
    // um pedido e um NFT com o mesmo id também são recursos distintos
    const order = { type: "order", id: "nft-0009" } as const;
    expect(gate.accept(event({ id: "c", version: 1, type: "order.updated", resource: order }))).toBe(true);
  });

  it("uma versão vista numa resposta REST barra eventos anteriores a ela", () => {
    const gate = createEventGate();
    gate.observe("nft", "nft-0009", 7);
    expect(gate.accept(event({ id: "a", version: 7 }))).toBe(false);
    expect(gate.accept(event({ id: "b", version: 8 }))).toBe(true);
  });

  it("observe nunca regride a versão conhecida", () => {
    const gate = createEventGate();
    gate.observe("nft", "nft-0009", 7);
    gate.observe("nft", "nft-0009", 3);
    expect(gate.accept(event({ id: "a", version: 5 }))).toBe(false);
  });

  it("reset esquece tudo: a sessão seguinte não herda o que a anterior viu", () => {
    const gate = createEventGate();
    gate.accept(event());
    gate.reset();
    expect(gate.accept(event())).toBe(true);
  });
});
