/**
 * API de controle da simulação, exposta em `window.__kurioMocks`.
 *
 * É usada pelo painel de cenários e pelos testes E2E para provocar situações
 * (mudança de preço, queda de conexão, pedido pendente…). Ela age sempre sobre
 * o banco simulado e o servidor Socket.IO do mock — nunca sobre a interface ou
 * o cache da aplicação —, de modo que todo efeito chega à UI pelos mesmos
 * caminhos de uma API real: respostas REST e eventos do socket.io-client.
 */
import type { NftUpdatedEvent } from "@/api/contracts";
import {
  getConfig,
  patchConfig,
  SCENARIOS,
  setScenario,
  type MockConfig,
  type ScenarioId,
} from "@/mocks/config";
import { resetGuestCartId, setSessionToken } from "@/lib/session-storage";
import { commit, db, resetDb } from "@/mocks/db";
import { findNft, toNftSummary } from "@/mocks/domain/catalog";
import { cancelOrderTimers, resolveOrder, toPublicOrder, updateNft } from "@/mocks/domain/orders";
import {
  broadcastEvent,
  connectionCount,
  dropConnections,
  emitRaw,
  getEventLog,
  replayEvent,
  resetRealtime,
  restoreConnections,
} from "@/mocks/realtime";

/**
 * Restaura integralmente o cenário conhecido: banco nas fixtures, cenário
 * "padrao" com os contadores de latência e de falhas zerados, nenhum pedido
 * agendado, servidor de eventos sem histórico. As sessões do banco deixam de
 * existir, então o token e o carrinho de visitante guardados no navegador
 * também são descartados (senão a próxima chamada responderia "sessão expirada").
 */
export async function resetMocks() {
  cancelOrderTimers();
  await resetDb();
  setScenario("padrao");
  resetRealtime();
  setSessionToken(null);
  resetGuestCartId();
}

// controles da simulação
export const mockControl = {
  scenarios: SCENARIOS,
  getConfig,
  patchConfig,

  setScenario(scenario: ScenarioId, overrides?: Partial<MockConfig>) {
    setScenario(scenario, overrides);
    db().submitChangeApplied = false;
    commit();
  },

  /** Restaura o banco e o cenário iniciais (ver resetMocks). A página deve ser recarregada em seguida. */
  reset: resetMocks,

  /** Altera preço e/ou disponibilidade por edição; emite nft.updated. */
  updateNft(
    nftId: string,
    change: { price?: string; previousPrice?: string | null; editions?: Record<string, number> },
  ) {
    return updateNft(nftId, change) !== null;
  },

  /** Reenvia um evento já emitido com o mesmo id (duplicata). Sem argumento, o último. */
  replayEvent(eventId?: string) {
    return replayEvent(eventId)?.id ?? null;
  },

  /** Reentrega um evento a todas as conexões, mesmo as de outra conta (roteamento errado do servidor). */
  broadcastEvent(eventId?: string) {
    return broadcastEvent(eventId)?.id ?? null;
  },

  /** Entrega um nft.updated com versão anterior à atual e preço diferente (evento antigo). */
  emitStaleNftEvent(nftId: string, price = "0.01") {
    const nft = findNft(nftId);
    if (!nft) return false;
    const event: NftUpdatedEvent = {
      id: `evt_stale_${nft.id}_${nft.version}`,
      type: "nft.updated",
      resource: { type: "nft", id: nft.id },
      version: nft.version - 1,
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      data: { nft: { ...toNftSummary(nft), price, version: nft.version - 1 }, editions: nft.editions },
    };
    emitRaw(event);
    return true;
  },

  getEventLog,
  connectionCount,
  dropConnections,
  restoreConnections,

  /** Conclui um pedido pendente (cenário "pedido-pendente"). */
  resolveOrder(orderId: string, status: "confirmed" | "rejected", reason?: string) {
    const order = resolveOrder(orderId, status, reason);
    return order ? toPublicOrder(order) : null;
  },

  listOrders() {
    return db().orders.map(toPublicOrder);
  },

  /** Vence todas as sessões: a próxima chamada autenticada responde 401 SESSION_EXPIRED. */
  expireSessions() {
    for (const session of db().sessions) session.expiresAt = 0;
    commit();
  },
};

export type MockControl = typeof mockControl;

declare global {
  interface Window {
    __kurioMocks?: MockControl;
  }
}
