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
import { commit, db, resetDb } from "@/mocks/db";
import { findNft, toNftSummary } from "@/mocks/domain/catalog";
import { cancelOrderTimers, resolveOrder, toPublicOrder, updateNft } from "@/mocks/domain/orders";
import {
  connectionCount,
  dropConnections,
  emitRaw,
  getEventLog,
  replayEvent,
  restoreConnections,
} from "@/mocks/realtime";

export const mockControl = {
  scenarios: SCENARIOS,
  getConfig,
  patchConfig,

  setScenario(scenario: ScenarioId, overrides?: Partial<MockConfig>) {
    setScenario(scenario, overrides);
    db().submitChangeApplied = false;
    commit();
  },

  /** Restaura o banco para o cenário inicial. A página deve ser recarregada em seguida. */
  async reset() {
    cancelOrderTimers();
    await resetDb();
    dropConnections();
  },

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
