/**
 * Configuração da simulação: latência, falhas injetadas e regras de negócio
 * variáveis. Cada cenário nomeado é um conjunto pronto dessas opções, usado
 * igualmente em desenvolvimento, na demonstração publicada e nos testes.
 */
import type { ApiErrorCode } from "@/api/contracts";

export type FaultRule = {
  /** "MÉTODO /caminho"; aceita `:param` e `*` (ex.: "GET /nfts/:id", "* *"). */
  route: string;
  /** http: responde com erro; network: falha de conexão; timeout: nunca responde. */
  kind: "http" | "network" | "timeout";
  status?: number;
  code?: ApiErrorCode;
  message?: string;
  /** "after": o handler executa (o efeito acontece) e só então a resposta falha. */
  phase?: "before" | "after";
  /** Quantas vezes a regra dispara; omitido = sempre. */
  times?: number;
};

export type OrderOutcome = "confirm" | "reject" | "hold";

export type MockConfig = {
  scenario: ScenarioId;
  /** Semente do gerador pseudoaleatório da latência: mesma semente, mesmos atrasos. */
  seed: number;
  latency: { min: number; max: number };
  /** Sequência fixa de atrasos (ms) por rota, repetida em ciclo. Tem prioridade sobre `latency`. */
  latencySequence: Record<string, number[]>;
  faults: FaultRule[];
  emptyCatalog: boolean;
  sessionTtlMs: number;
  order: {
    /** confirm/reject: resolve sozinho após `delayMs`; hold: fica pendente até ser resolvido manualmente. */
    outcome: OrderOutcome;
    delayMs: number;
    rejectionReason: string;
  };
  /** A carteira recusa o pedido de conexão. */
  walletRefuses: boolean;
  /** Alteração aplicada ao primeiro item do carrinho no instante em que o pedido é enviado (uma vez). */
  onOrderSubmit: "none" | "price-change" | "sold-out";
};

// um dia em ms
const DAY = 24 * 60 * 60 * 1000;

// configuração padrão
const BASE: Omit<MockConfig, "scenario"> = {
  seed: 42,
  latency: { min: 120, max: 380 },
  latencySequence: {},
  faults: [],
  emptyCatalog: false,
  sessionTtlMs: 7 * DAY,
  order: {
    outcome: "confirm",
    delayMs: 2500,
    rejectionReason: "A carteira recusou a assinatura da transação.",
  },
  walletRefuses: false,
  onOrderSubmit: "none",
};

type ScenarioDefinition = {
  label: string;
  description: string;
  overrides: Partial<Omit<MockConfig, "scenario">>;
};

// cenários nomeados
export const SCENARIOS = {
  padrao: {
    label: "Padrão",
    description: "Tudo funciona: latência curta, pagamento confirmado.",
    overrides: {},
  },
  "catalogo-vazio": {
    label: "Catálogo vazio",
    description: "A listagem de NFTs não retorna resultados.",
    overrides: { emptyCatalog: true },
  },
  "rede-lenta": {
    label: "Rede lenta",
    description: "Todas as respostas levam de 2,5 a 3,5 s (skeletons visíveis).",
    overrides: { latency: { min: 2500, max: 3500 } },
  },
  "latencia-variavel": {
    label: "Latência variável",
    description: "A listagem alterna respostas de 1,8 s e 0,15 s: respostas chegam fora de ordem.",
    overrides: { latencySequence: { "GET /nfts": [1800, 150] } },
  },
  offline: {
    label: "Sem conexão",
    description: "Toda requisição falha como erro de rede.",
    overrides: { faults: [{ route: "* *", kind: "network" }] },
  },
  "erro-servidor": {
    label: "Erro no servidor",
    description: "Catálogo e detalhe respondem 500.",
    overrides: {
      faults: [
        { route: "GET /nfts", kind: "http", status: 500, code: "INTERNAL_ERROR" },
        { route: "GET /nfts/:id", kind: "http", status: 500, code: "INTERNAL_ERROR" },
      ],
    },
  },
  "falha-transitoria": {
    label: "Falha transitória",
    description: "As duas primeiras chamadas ao catálogo respondem 503; a seguinte funciona.",
    overrides: {
      faults: [
        { route: "GET /nfts", kind: "http", status: 503, code: "SERVICE_UNAVAILABLE", times: 2 },
      ],
    },
  },
  "sessao-expirada": {
    label: "Sessão expirada",
    description: "A sessão expira 20 s após o login.",
    overrides: { sessionTtlMs: 20_000 },
  },
  "falha-favorito": {
    label: "Falha ao favoritar",
    description: "Adicionar ou remover favorito responde 500 (rollback da atualização otimista).",
    overrides: {
      faults: [
        { route: "PUT /favorites/:id", kind: "http", status: 500, code: "INTERNAL_ERROR" },
        { route: "DELETE /favorites/:id", kind: "http", status: 500, code: "INTERNAL_ERROR" },
      ],
    },
  },
  "carteira-recusada": {
    label: "Carteira recusa a conexão",
    description: "O pedido de conexão da carteira é recusado.",
    overrides: { walletRefuses: true },
  },
  "preco-alterado": {
    label: "Preço alterado na compra",
    description: "O preço do primeiro item sobe no instante do envio do pedido.",
    overrides: { onOrderSubmit: "price-change" },
  },
  "edicao-esgotada": {
    label: "Edição esgotada na compra",
    description: "A edição do primeiro item esgota no instante do envio do pedido.",
    overrides: { onOrderSubmit: "sold-out" },
  },
  "timeout-pedido": {
    label: "Timeout após criar o pedido",
    description:
      "O pedido é criado, mas a primeira resposta nunca chega. A nova tentativa recupera o mesmo pedido.",
    overrides: { faults: [{ route: "POST /orders", kind: "timeout", phase: "after", times: 1 }] },
  },
  "pagamento-recusado": {
    label: "Pagamento recusado",
    description: "O pedido é criado e depois recusado.",
    overrides: { order: { ...BASE.order, outcome: "reject" } },
  },
  "pedido-pendente": {
    label: "Pedido pendente",
    description: "O pedido fica pendente até ser resolvido pelo painel de cenários.",
    overrides: { order: { ...BASE.order, outcome: "hold" } },
  },
} satisfies Record<string, ScenarioDefinition>;

export type ScenarioId = keyof typeof SCENARIOS;

// diz se o valor é um cenário válido
export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && value in SCENARIOS;
}

// monta a configuração de um cenário
export function buildConfig(scenario: ScenarioId, overrides: Partial<MockConfig> = {}): MockConfig {
  const preset: ScenarioDefinition = SCENARIOS[scenario];
  return structuredClone({ ...BASE, ...preset.overrides, ...overrides, scenario });
}

// chave no localStorage
const STORAGE_KEY = "kurio.mock.config";

type StoredConfig = {
  config: MockConfig;
  faultHits: number[];
  requestCounts: Record<string, number>;
};

let state: StoredConfig = load();

// carrega a configuração gravada
function load(): StoredConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredConfig>;
      if (parsed.config && isScenarioId(parsed.config.scenario)) {
        // completa com os padrões: tolera configurações gravadas por versões anteriores
        return {
          config: { ...buildConfig(parsed.config.scenario), ...parsed.config },
          faultHits: parsed.faultHits ?? [],
          requestCounts: parsed.requestCounts ?? {},
        };
      }
    }
  } catch {
    // configuração corrompida: volta ao padrão
  }
  return { config: buildConfig("padrao"), faultHits: [], requestCounts: {} };
}

// grava a configuração
function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sem persistência: a configuração vale até o próximo carregamento
  }
}

// configuração atual
export function getConfig(): MockConfig {
  return state.config;
}

/** Troca a configuração e zera os contadores de falhas e de latência. */
export function setConfig(config: MockConfig) {
  state = { config: structuredClone(config), faultHits: [], requestCounts: {} };
  save();
}

// troca de cenário
export function setScenario(scenario: ScenarioId, overrides: Partial<MockConfig> = {}) {
  setConfig(buildConfig(scenario, overrides));
}

// altera parte da configuração
export function patchConfig(patch: Partial<MockConfig>) {
  state.config = { ...state.config, ...structuredClone(patch) };
  save();
}

// diz se a rota casa com o padrão
function routeMatches(pattern: string, method: string, path: string): boolean {
  const [patternMethod = "*", patternPath = "*"] = pattern.split(" ");
  if (patternMethod !== "*" && patternMethod.toUpperCase() !== method.toUpperCase()) return false;
  if (patternPath === "*") return true;
  const expected = patternPath.split("/");
  const actual = path.split("/");
  if (expected.length !== actual.length) return false;
  return expected.every(
    (part, index) => part.startsWith(":") || part === "*" || part === actual[index],
  );
}

/** Devolve a regra de falha aplicável à requisição e consome uma ocorrência dela. */
export function takeFault(method: string, path: string): FaultRule | null {
  const index = state.config.faults.findIndex((rule, ruleIndex) => {
    if (!routeMatches(rule.route, method, path)) return false;
    return rule.times === undefined || (state.faultHits[ruleIndex] ?? 0) < rule.times;
  });
  const rule = state.config.faults[index];
  if (!rule) return null;
  state.faultHits[index] = (state.faultHits[index] ?? 0) + 1;
  save();
  return rule;
}

// gerador pseudoaleatório com semente
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Atraso determinístico da n-ésima requisição a uma rota. */
export function nextLatency(method: string, path: string): number {
  const { latency, latencySequence, seed } = state.config;
  const sequenceKey = Object.keys(latencySequence).find((route) =>
    routeMatches(route, method, path),
  );
  const counterKey = sequenceKey ?? "*";
  const count = state.requestCounts[counterKey] ?? 0;
  state.requestCounts[counterKey] = count + 1;
  save();

  const sequence = sequenceKey ? latencySequence[sequenceKey] : undefined;
  if (sequence?.length) return sequence[count % sequence.length] ?? 0;

  const random = mulberry32(seed + count)();
  return Math.round(latency.min + random * (latency.max - latency.min));
}
