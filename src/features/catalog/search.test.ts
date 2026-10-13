import { describe, expect, it } from "vitest";
import {
  catalogSearchSchema,
  formatList,
  hasActiveFilters,
  parseList,
  toListParams,
} from "@/features/catalog/search";

describe("estado do catálogo na URL", () => {
  it("lista separada por vírgula vira array e volta ordenada", () => {
    expect(parseList("musica, jogos ,,arte-3d")).toEqual(["musica", "jogos", "arte-3d"]);
    expect(parseList(undefined)).toEqual([]);
    expect(formatList(["musica", "arte-3d"])).toBe("arte-3d,musica");
    expect(formatList([])).toBeUndefined();
  });

  it("descarta valores inválidos em vez de quebrar a página", () => {
    const parsed = catalogSearchSchema.parse({ aba: "inexistente", ordem: "aleatoria", pagina: "abc" });
    expect(parsed).toEqual({});
  });

  it("aceita números vindos do roteador como texto", () => {
    expect(catalogSearchSchema.parse({ q: 42, min: 1.5 })).toMatchObject({ q: "42", min: "1.5" });
  });

  it("a página 1 não aparece na URL", () => {
    expect(catalogSearchSchema.parse({ pagina: 1 }).pagina).toBeUndefined();
    expect(catalogSearchSchema.parse({ pagina: "3" }).pagina).toBe(3);
  });

  it("converte a URL nos parâmetros do contrato REST", () => {
    expect(
      toListParams({
        q: "ape",
        colecoes: "musica,jogos",
        redes: "polygon,rede-falsa",
        min: "0.5",
        max: "2",
        aba: "em-alta",
        ordem: "preco-asc",
        pagina: 3,
      }),
    ).toEqual({
      page: 3,
      pageSize: 9,
      q: "ape",
      categories: ["musica", "jogos"],
      networks: ["polygon"],
      minPrice: "0.5",
      maxPrice: "2",
      tab: "em-alta",
      sort: "preco-asc",
    });
  });

  it("sem filtros, pede a primeira página e nada mais", () => {
    expect(toListParams({})).toEqual({ page: 1, pageSize: 9 });
  });

  it("ignora preço que não é um valor em ETH válido", () => {
    expect(toListParams({ min: "barato", max: "1,5" })).toEqual({ page: 1, pageSize: 9 });
  });

  it("ordenação e página não contam como filtro ativo", () => {
    expect(hasActiveFilters({ ordem: "nome", pagina: 2 })).toBe(false);
    expect(hasActiveFilters({ redes: "solana" })).toBe(true);
    expect(hasActiveFilters({ q: "ape" })).toBe(true);
  });
});
