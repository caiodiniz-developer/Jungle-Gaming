import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig, mulberry32, nextLatency, setScenario, takeFault } from "@/mocks/config";

describe("cenários determinísticos da simulação", () => {
  beforeEach(() => setScenario("padrao"));

  it("o gerador com semente repete a mesma sequência", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(mulberry32(7)()).not.toBe(first[0]);
  });

  it("a latência padrão fica na faixa do cenário e se repete após trocar de cenário", () => {
    const run = () => [nextLatency("GET", "/nfts"), nextLatency("GET", "/cart"), nextLatency("POST", "/quotes")];
    const first = run();
    expect(first.every((delay) => delay >= 120 && delay <= 380)).toBe(true);
    // trocar de cenário zera os contadores: a mesma sequência de requisições, os mesmos atrasos
    setScenario("padrao");
    expect(run()).toEqual(first);
  });

  it("latência variável alterna lento e rápido na listagem (respostas fora de ordem)", () => {
    setScenario("latencia-variavel");
    expect([1, 2, 3, 4].map(() => nextLatency("GET", "/nfts"))).toEqual([1800, 150, 1800, 150]);
  });

  it("falha transitória acontece duas vezes e depois some", () => {
    setScenario("falha-transitoria");
    expect(takeFault("GET", "/nfts")).toMatchObject({ status: 503 });
    expect(takeFault("GET", "/nfts")).toMatchObject({ status: 503 });
    expect(takeFault("GET", "/nfts")).toBeNull();
  });

  it("a falha só vale para a rota e o método do cenário", () => {
    setScenario("erro-servidor");
    expect(takeFault("GET", "/nfts/nft-0042")).toMatchObject({ status: 500 });
    expect(takeFault("POST", "/nfts")).toBeNull();
    expect(takeFault("GET", "/cart")).toBeNull();
  });

  it("offline derruba qualquer requisição", () => {
    setScenario("offline");
    expect(takeFault("POST", "/orders")).toMatchObject({ kind: "network" });
    expect(takeFault("GET", "/qualquer/coisa")).toMatchObject({ kind: "network" });
  });

  it("timeout do pedido age depois do handler, uma única vez", () => {
    setScenario("timeout-pedido");
    expect(takeFault("POST", "/orders")).toMatchObject({ kind: "timeout", phase: "after" });
    expect(takeFault("POST", "/orders")).toBeNull();
  });

  it("cada cenário parte da configuração base", () => {
    expect(buildConfig("pagamento-recusado").order.outcome).toBe("reject");
    expect(buildConfig("pedido-pendente").order.outcome).toBe("hold");
    expect(buildConfig("padrao", { walletRefuses: true })).toMatchObject({
      scenario: "padrao",
      walletRefuses: true,
      latency: { min: 120, max: 380 },
    });
  });
});
