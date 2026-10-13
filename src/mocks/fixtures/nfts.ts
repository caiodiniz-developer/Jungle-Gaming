import type { Artwork, Network, NftEdition } from "@/api/contracts";
import { mulberry32 } from "@/mocks/config";
import type { DbNft } from "@/mocks/types";

/** Categorias do filtro "Coleções", com as contagens exibidas no layout. */
export const CATEGORIES = [
  { id: "arte-digital", name: "Arte digital", count: 33 },
  { id: "fotografia", name: "Fotografia", count: 12 },
  { id: "musica", name: "Música", count: 65 },
  { id: "arte-3d", name: "Arte 3D", count: 39 },
  { id: "colecionaveis", name: "Colecionáveis", count: 23 },
  { id: "generativa", name: "Generativa", count: 17 },
  { id: "jogos", name: "Jogos", count: 19 },
  { id: "assinaturas", name: "Assinaturas", count: 13 },
  { id: "utilidade", name: "Utilidade", count: 18 },
] as const;

// artes disponíveis
const ARTWORKS: Artwork[] = ["emerald-ape", "sage-nomad", "ivory-baron", "golden-beat"];
// redes (com pesos)
const NETWORKS: Network[] = ["ethereum", "ethereum", "ethereum", "polygon", "polygon", "solana"];

// primeira palavra dos nomes gerados
const ADJECTIVES = [
  "Amber", "Lunar", "Velvet", "Solar", "Crimson", "Silent", "Electric", "Hollow", "Golden",
  "Misty", "Neon", "Ancient", "Cobalt", "Feral", "Gilded", "Ivory", "Jade", "Obsidian",
  "Radiant", "Scarlet", "Tidal", "Umber", "Vivid", "Wild", "Zen", "Astral", "Burnt", "Copper",
];

// segunda palavra dos nomes gerados
const NOUNS = [
  "Drifter", "Oracle", "Voyager", "Monarch", "Echo", "Sentinel", "Nomad", "Baron", "Signal",
  "Bloom", "Vessel", "Beat", "Cipher", "Ronin", "Herald", "Warden", "Pilgrim", "Mirage",
  "Totem", "Rider", "Scholar", "Jester", "Prophet", "Outlaw", "Dreamer", "Keeper",
];

// coleções por categoria
const COLLECTIONS: Record<string, string[]> = {
  "arte-digital": ["Kurio Apes", "Pixel Reverie", "Chroma Fields"],
  fotografia: ["Still Frames", "Night Exposure"],
  musica: ["Sonic Relics", "Tape Loop Society", "Bassline Bestiary"],
  "arte-3d": ["Sculpted Minds", "Polygon Zoo"],
  colecionaveis: ["Kurio Apes", "Vault Curios"],
  generativa: ["Noise Garden", "Seeded Forms"],
  jogos: ["Arcade Legends", "Quest Tokens"],
  assinaturas: ["Inner Circle", "Backstage Pass"],
  utilidade: ["Access Keys", "Builder Badges"],
};

// criadores
const CREATORS = ["Nova Sato", "Iris Okafor", "Téo Marins", "Lia Brandt", "Kenji Duarte", "Ada Reyes"];

// atributos possíveis
const ATTRIBUTE_POOL = [
  "Óculos", "Esmeralda", "Capuz", "Chapéu", "Fones", "Jaqueta", "Blazer", "Corrente", "Brinco",
  "Fundo creme", "Fundo verde", "Olhar sereno", "Sorriso", "Raro", "Edição de estreia",
];

/** Data fixa de referência: mantém `listedAt` estável entre execuções (regressão visual). */
const REFERENCE_DATE = Date.UTC(2026, 6, 29, 12, 0, 0);
// uma hora em ms
const HOUR = 60 * 60 * 1000;

type Featured = {
  name: string;
  token: number;
  artwork: Artwork;
  price: string;
  previousPrice?: string;
  rare?: boolean;
  category: string;
};

/** Os nove primeiros itens reproduzem a primeira página do layout. */
const FEATURED: Featured[] = [
  { name: "Emerald Ape", token: 42, artwork: "emerald-ape", price: "1.19", category: "arte-digital" },
  { name: "Sage Nomad", token: 9, artwork: "sage-nomad", price: "1.69", category: "arte-digital" },
  { name: "Neon Vessel", token: 552, artwork: "ivory-baron", price: "1.99", previousPrice: "2.29", rare: true, category: "colecionaveis" },
  { name: "Cosmic Bloom", token: 118, artwork: "sage-nomad", price: "1.29", category: "arte-digital" },
  { name: "Violet Nomad", token: 314, artwork: "sage-nomad", price: "1.39", category: "colecionaveis" },
  { name: "Ivory Baron", token: 88, artwork: "ivory-baron", price: "1.79", category: "arte-digital" },
  { name: "Golden Beat", token: 207, artwork: "golden-beat", price: "0.99", category: "colecionaveis" },
  { name: "Golden Frequency", token: 71, artwork: "golden-beat", price: "0.59", category: "arte-digital" },
  { name: "Golden Signal", token: 160, artwork: "golden-beat", price: "0.39", category: "colecionaveis" },
];

// sorteia um item
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

// centésimos → string decimal
function cents(value: number): string {
  return (value / 100).toFixed(2);
}

// monta uma edição
function edition(id: string, label: string, available: number): NftEdition {
  return { id, label, available, maxPerOrder: Math.min(available, 10) };
}

// edições de um NFT
function buildEditions(random: () => number, soldOut: boolean): NftEdition[] {
  if (soldOut) {
    return [edition("1-1", "1/1", 0), edition("1-10", "1/10", 0), edition("1-50", "1/50", 0)];
  }
  const editions = [
    edition("1-1", "1/1", random() < 0.45 ? 1 : 0),
    edition("1-10", "1/10", Math.floor(random() * 11)),
    edition("1-50", "1/50", 5 + Math.floor(random() * 46)),
  ];
  if (random() < 0.6) editions.push(edition("open", "ABERTA", 999));
  return editions;
}

// monta um NFT
function buildNft(options: {
  index: number;
  name: string;
  token: number;
  artwork: Artwork;
  price: string;
  previousPrice: string | null;
  rare: boolean;
  categoryId: string;
  collection: string;
  editions: NftEdition[];
  random: () => number;
}): DbNft {
  const { index, name, token, random } = options;
  const category = CATEGORIES.find((item) => item.id === options.categoryId) ?? CATEGORIES[0];
  const tokenId = String(token).padStart(4, "0");
  const fullName = `${name} #${String(token).padStart(3, "0")}`;
  const creator = pick(CREATORS, random);
  const network = pick(NETWORKS, random);
  const networkName = network === "ethereum" ? "Ethereum" : network === "polygon" ? "Polygon" : "Solana";
  const royaltyPercent = 3 + Math.floor(random() * 6);
  const attributes = Array.from(
    new Set([pick(ATTRIBUTE_POOL, random), pick(ATTRIBUTE_POOL, random), pick(ATTRIBUTE_POOL, random)]),
  );
  if (options.rare && !attributes.includes("Raro")) attributes.push("Raro");
  const contractHead = Math.floor(random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  const contractTail = Math.floor(random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");

  return {
    id: `nft-${tokenId}`,
    tokenId,
    name: fullName,
    artwork: options.artwork,
    price: options.price,
    previousPrice: options.previousPrice,
    category: { id: category.id, name: category.name },
    network,
    rare: options.rare,
    // um item por hora, do mais recente para o mais antigo
    listedAt: new Date(REFERENCE_DATE - index * 7 * HOUR).toISOString(),
    version: 1,
    collection: options.collection,
    creator,
    summary: `Um colecionável digital finalizado à mão da coleção ${options.collection}, verificado na ${networkName}, com arte desbloqueável e acesso para colecionadores.`,
    description: [
      `${fullName} é uma obra digital finalizada à mão da coleção ${options.collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkName}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe ${royaltyPercent}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    attributes,
    contract: `0x${contractHead}...${contractTail}`,
    royaltyPercent,
    rating: { average: 38 + Math.floor(random() * 12), count: 3 + Math.floor(random() * 60) },
    editions: options.editions,
    trending: random() < 0.22,
    isNew: index < 36,
  };
}

/** Gera o catálogo completo. Determinístico: a mesma semente produz sempre os mesmos 239 NFTs. */
export function buildNftFixtures(): DbNft[] {
  const random = mulberry32(20260729);
  const nfts: DbNft[] = [];
  const usedTokens = new Set(FEATURED.map((item) => item.token));
  const remaining = new Map<string, number>(CATEGORIES.map((item) => [item.id, item.count]));

  for (const [index, item] of FEATURED.entries()) {
    remaining.set(item.category, (remaining.get(item.category) ?? 0) - 1);
    const isEmerald = item.token === 42;
    nfts.push(
      buildNft({
        index,
        name: item.name,
        token: item.token,
        artwork: item.artwork,
        price: item.price,
        previousPrice: item.previousPrice ?? null,
        rare: item.rare ?? false,
        categoryId: item.category,
        collection: "Kurio Apes",
        // Emerald Ape é a referência do layout: 1/1 esgotada demonstra a edição indisponível
        editions: isEmerald
          ? [edition("1-1", "1/1", 0), edition("1-10", "1/10", 4), edition("1-50", "1/50", 37), edition("open", "ABERTA", 999)]
          : [edition("1-1", "1/1", 1), edition("1-10", "1/10", 10), edition("1-50", "1/50", 50), edition("open", "ABERTA", 999)],
        random,
      }),
    );
    const created = nfts[nfts.length - 1];
    if (created && isEmerald) {
      // dados exibidos na tela de detalhes do layout
      created.rating = { average: 48, count: 19 };
      created.network = "ethereum";
      created.creator = "Nova Sato";
      created.royaltyPercent = 5;
      created.attributes = ["Óculos", "Esmeralda", "Raro"];
      created.contract = "0x7A42...19E8";
      created.summary =
        "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.";
      created.description = [
        "Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.",
        "A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.",
      ];
    }
  }

  // distribui as categorias de forma intercalada para que qualquer página tenha variedade
  const queue: string[] = [];
  let pending = true;
  while (pending) {
    pending = false;
    for (const category of CATEGORIES) {
      const left = remaining.get(category.id) ?? 0;
      if (left > 0) {
        queue.push(category.id);
        remaining.set(category.id, left - 1);
        pending = true;
      }
    }
  }

  for (const [offset, categoryId] of queue.entries()) {
    const index = FEATURED.length + offset;
    let token = 1 + Math.floor(random() * 9998);
    while (usedTokens.has(token)) token = 1 + Math.floor(random() * 9998);
    usedTokens.add(token);

    // preços concentrados na faixa baixa, entre 0.02 e 12.30 ETH
    const skew = random() ** 2.4;
    let priceCents = 2 + Math.floor(skew * 1228);
    if (offset === 0) priceCents = 2;
    if (offset === 1) priceCents = 1230;
    const onSale = random() < 0.12;

    nfts.push(
      buildNft({
        index,
        name: `${pick(ADJECTIVES, random)} ${pick(NOUNS, random)}`,
        token,
        artwork: ARTWORKS[index % ARTWORKS.length] as Artwork,
        price: cents(priceCents),
        previousPrice: onSale ? cents(Math.round(priceCents * 1.2) + 1) : null,
        rare: random() < 0.1,
        categoryId,
        collection: pick(COLLECTIONS[categoryId] ?? ["Kurio Editions"], random),
        editions: buildEditions(random, random() < 0.06),
        random,
      }),
    );
  }

  // a nota é guardada em décimos (48 = 4,8) para não depender de ponto flutuante
  return nfts.map((nft) => ({
    ...nft,
    rating: { average: nft.rating.average / 10, count: nft.rating.count },
  }));
}
