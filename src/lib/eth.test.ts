import { describe, expect, it } from "vitest";
import {
  addEth,
  compareEth,
  formatEth,
  formatEthLabel,
  fromWei,
  isEthAmount,
  isZeroEth,
  multiplyEth,
  percentOfEth,
  shortenHash,
  subtractEth,
  toWei,
} from "@/lib/eth";

describe("aritmética de ETH", () => {
  it("não perde precisão onde o ponto flutuante perderia", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addEth("0.1", "0.2")).toBe("0.3");
    expect(multiplyEth("1.79", 9)).toBe("16.11");
    expect(subtractEth("26.846", "0.016")).toBe("26.83");
  });

  it("converte para wei e volta sem alterar o valor", () => {
    expect(toWei("1")).toBe(10n ** 18n);
    expect(toWei("0.000000000000000001")).toBe(1n);
    expect(fromWei(toWei("12.30"))).toBe("12.3");
    expect(fromWei(toWei("-0.5"))).toBe("-0.5");
  });

  it("soma qualquer quantidade de parcelas", () => {
    expect(addEth()).toBe("0");
    expect(addEth("2.38", "8.34", "16.11")).toBe("26.83");
  });

  it("calcula percentual inteiro truncando no nível de wei", () => {
    expect(percentOfEth("3.38", 10)).toBe("0.338");
    expect(percentOfEth("0.000000000000000009", 10)).toBe("0");
  });

  it("recusa quantidade e percentual não inteiros", () => {
    expect(() => multiplyEth("1", 1.5)).toThrow();
    expect(() => percentOfEth("1", 2.5)).toThrow();
  });

  it("valida o formato do valor", () => {
    expect(isEthAmount("1.19")).toBe(true);
    expect(isEthAmount("-3")).toBe(true);
    expect(isEthAmount("1,19")).toBe(false);
    expect(isEthAmount("abc")).toBe(false);
    expect(isEthAmount("1.")).toBe(false);
    // mais de 18 casas não cabe em wei
    expect(isEthAmount("0.0000000000000000001")).toBe(false);
    expect(() => toWei("1,19")).toThrow();
  });

  it("compara valores", () => {
    expect(compareEth("1.2", "1.19")).toBe(1);
    expect(compareEth("1.10", "1.1")).toBe(0);
    expect(compareEth("0.99", "1")).toBe(-1);
    expect(isZeroEth("0.000")).toBe(true);
    expect(isZeroEth("0.001")).toBe(false);
  });
});

describe("formatação", () => {
  it("mostra ao menos duas casas, sem arredondar", () => {
    expect(formatEth("2")).toBe("2.00");
    expect(formatEth("1.5")).toBe("1.50");
    expect(formatEth("0.016")).toBe("0.016");
    expect(formatEth("1.23456789")).toBe("1.234567");
    expect(formatEthLabel("26.846")).toBe("26.846 ETH");
  });

  it("abrevia endereços e hashes", () => {
    expect(shortenHash("0xA91F3c5B7e2D4a6F8b0C1d2E3f4A5b6C7d8EE82C")).toBe("0xA91F…E82C");
    expect(shortenHash("nova.eth")).toBe("nova.eth");
  });
});
