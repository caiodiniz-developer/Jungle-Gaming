/**
 * Aritmética de valores em ETH sem ponto flutuante.
 *
 * Os valores trafegam como strings decimais ("1.19") e são convertidos para
 * wei (bigint, 18 casas) apenas para calcular. Nunca passam por `number`,
 * então somas como 0.1 + 0.2 não perdem precisão.
 */

const DECIMALS = 18;
const UNIT = 10n ** BigInt(DECIMALS);
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** Valor em ETH como string decimal, ex.: "26.846". */
export type EthAmount = string;

export function isEthAmount(value: string): boolean {
  if (!DECIMAL_PATTERN.test(value)) return false;
  const fraction = value.split(".")[1];
  return fraction === undefined || fraction.length <= DECIMALS;
}

export function toWei(value: EthAmount): bigint {
  if (!isEthAmount(value)) throw new Error(`Valor em ETH inválido: "${value}"`);
  const negative = value.startsWith("-");
  const [whole = "0", fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const wei = BigInt(whole) * UNIT + BigInt(fraction.padEnd(DECIMALS, "0"));
  return negative ? -wei : wei;
}

/** Forma canônica: sem zeros à direita e sem ponto pendurado ("1.50" → "1.5"). */
export function fromWei(wei: bigint): EthAmount {
  const negative = wei < 0n;
  const absolute = negative ? -wei : wei;
  const whole = absolute / UNIT;
  const fraction = (absolute % UNIT).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function addEth(...values: EthAmount[]): EthAmount {
  return fromWei(values.reduce((total, value) => total + toWei(value), 0n));
}

export function subtractEth(a: EthAmount, b: EthAmount): EthAmount {
  return fromWei(toWei(a) - toWei(b));
}

export function multiplyEth(value: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity)) throw new Error("A quantidade deve ser um número inteiro");
  return fromWei(toWei(value) * BigInt(quantity));
}

/** Percentual inteiro do valor, arredondado para baixo no nível de wei. */
export function percentOfEth(value: EthAmount, percent: number): EthAmount {
  if (!Number.isInteger(percent)) throw new Error("O percentual deve ser um número inteiro");
  return fromWei((toWei(value) * BigInt(percent)) / 100n);
}

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b);
  return diff === 0n ? 0 : diff < 0n ? -1 : 1;
}

export function isZeroEth(value: EthAmount): boolean {
  return toWei(value) === 0n;
}

/**
 * Formata para exibição como no layout: ao menos 2 casas ("1.19", "0.016", "2.00").
 * O valor nunca é arredondado; casas além de `maxDecimals` são truncadas.
 */
export function formatEth(value: EthAmount, { minDecimals = 2, maxDecimals = 6 } = {}): string {
  const [whole = "0", fraction = ""] = fromWei(toWei(value)).split(".");
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, "");
  return `${whole}.${trimmed.padEnd(minDecimals, "0")}`;
}

export function formatEthLabel(value: EthAmount): string {
  return `${formatEth(value)} ETH`;
}

/** Abrevia endereços e hashes como no layout: "0xA91F…E82C". */
export function shortenHash(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
