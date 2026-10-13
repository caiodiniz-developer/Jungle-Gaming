import type { RealtimeEnvelope, RealtimeEventType } from "@/api/contracts";

type AnyEnvelope = RealtimeEnvelope<RealtimeEventType, unknown>;

const MAX_REMEMBERED_IDS = 500;

/**
 * Decide se um evento deve ser aplicado.
 *
 * - Duplicata: um `id` já visto é descartado, então reentregas não repetem efeitos.
 * - Evento antigo: a `version` precisa ser maior que a última aplicada ao mesmo
 *   recurso, então um evento atrasado nunca regride um estado mais recente.
 */
export function createEventGate() {
  const seenIds = new Set<string>();
  const versions = new Map<string, number>();

  const keyOf = (event: AnyEnvelope) => `${event.resource.type}:${event.resource.id}`;

  return {
    /** Registra uma versão conhecida por outra via (ex.: resposta REST), para barrar eventos anteriores a ela. */
    observe(resourceType: AnyEnvelope["resource"]["type"], resourceId: string, version: number) {
      const key = `${resourceType}:${resourceId}`;
      if (version > (versions.get(key) ?? 0)) versions.set(key, version);
    },

    accept(event: AnyEnvelope): boolean {
      if (seenIds.has(event.id)) return false;
      seenIds.add(event.id);
      if (seenIds.size > MAX_REMEMBERED_IDS) {
        const oldest = seenIds.values().next().value;
        if (oldest !== undefined) seenIds.delete(oldest);
      }

      const key = keyOf(event);
      if (event.version <= (versions.get(key) ?? 0)) return false;
      versions.set(key, event.version);
      return true;
    },

    /** Usado na troca de usuário: a nova sessão não herda o que a anterior viu. */
    reset() {
      seenIds.clear();
      versions.clear();
    },
  };
}

export type EventGate = ReturnType<typeof createEventGate>;
