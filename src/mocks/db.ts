/**
 * Banco de dados simulado: um objeto em memória espelhado no localStorage.
 * É a única fonte de estado dos mocks — respostas REST e eventos Socket.IO
 * leem daqui, o que mantém catálogo, carrinho, favoritos e pedidos coerentes
 * e faz o estado sobreviver ao refresh.
 */
import type { User, Wallet } from "@/api/contracts";
import { buildNftFixtures } from "@/mocks/fixtures/nfts";
import type { Db, DbUser } from "@/mocks/types";

// chave no localStorage
const STORAGE_KEY = "kurio.mock.db";
/** Incrementar ao mudar o formato das fixtures: descarta estados gravados incompatíveis. */
const SCHEMA_VERSION = 2;

/** Credenciais fictícias da demonstração (documentadas no README). */
export const DEMO_USERS = [
  {
    email: "colecionador@kurio.test",
    password: "Kurio@123",
    username: "nova.sato",
    displayName: "Nova Sato",
    ensName: "nova.kurio.eth",
    walletAlias: "Principal",
  },
  {
    email: "nova@kurio.test",
    password: "Kurio@456",
    username: "iris.okafor",
    displayName: "Iris Okafor",
    ensName: "iris.eth",
    walletAlias: "Reserva",
  },
] as const;

// data fixa das fixtures
const SEED_TIMESTAMP = "2026-07-29T12:00:00.000Z";

let state: Db | null = null;

// banco simulado atual
export function db(): Db {
  if (!state) throw new Error("O banco simulado ainda não foi iniciado (initDb).");
  return state;
}

/** Grava o estado atual. Chamado pelos handlers após cada mutação. */
export function commit() {
  if (!state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // armazenamento cheio ou bloqueado: o estado segue válido só em memória
  }
}

// bytes → hexadecimal
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// hexadecimal aleatório
export function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

// hash da senha com salt
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

// usuário sem os campos internos
export function toPublicUser(user: DbUser): User {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    ensName: user.ensName,
    walletAlias: user.walletAlias,
    avatarUrl: user.avatarUrl,
  };
}

// cria o estado inicial
async function seed(): Promise<Db> {
  const users: DbUser[] = [];
  for (const [index, demo] of DEMO_USERS.entries()) {
    // salt fixo nas fixtures: o estado inicial é idêntico em toda execução
    const passwordSalt = `seed-salt-${index + 1}`;
    users.push({
      id: `usr_${index + 1}`,
      email: demo.email,
      username: demo.username,
      displayName: demo.displayName,
      ensName: demo.ensName,
      walletAlias: demo.walletAlias,
      avatarUrl: null,
      passwordSalt,
      passwordHash: await hashPassword(demo.password, passwordSalt),
    });
  }

  const wallets: Wallet[] = [
    {
      id: "wal_1",
      kind: "primary",
      displayName: "Nova Sato",
      alias: "Principal",
      network: "ethereum",
      profileName: "Nova Sato",
      address: "0xA91F3c5B7e2D4a6F8b0C1d2E3f4A5b6C7d8EE82C",
      secondaryAddress: "",
      provider: "metamask",
      referralCode: "KURIO2026",
      email: "colecionador@kurio.test",
      ensName: "nova.kurio.eth",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: "wal_2",
      kind: "secondary",
      displayName: "Nova Sato",
      alias: "Reserva",
      network: "polygon",
      profileName: "Nova Sato",
      address: "0x7A42b1C3d5E7f9A0b2C4d6E8f0A1b3C5d7E919E8",
      secondaryAddress: "nova.kurio.eth",
      provider: "coinbase",
      referralCode: "KURIO2026",
      email: "colecionador@kurio.test",
      ensName: "nova.kurio.eth",
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: buildNftFixtures(),
    users,
    sessions: [],
    carts: {},
    favorites: { usr_1: ["nft-0009", "nft-0088"] },
    wallets: { usr_1: wallets },
    walletConnections: {},
    orders: [],
    quotes: {},
    counters: { user: users.length, wallet: wallets.length, order: 0, event: 0 },
    submitChangeApplied: false,
  };
}

/** Carrega o estado persistido ou, na primeira execução, cria o cenário inicial. */
export async function initDb(): Promise<Db> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed.schemaVersion === SCHEMA_VERSION) {
        state = parsed;
        return state;
      }
    }
  } catch {
    // estado corrompido: recria a partir das fixtures
  }
  state = await seed();
  commit();
  return state;
}

/** Restaura integralmente o cenário inicial conhecido. */
export async function resetDb(): Promise<Db> {
  state = await seed();
  commit();
  return state;
}

// próximo id sequencial
export function nextId(kind: keyof Db["counters"], prefix: string): string {
  const current = db();
  current.counters[kind] += 1;
  return `${prefix}_${String(current.counters[kind]).padStart(4, "0")}`;
}
