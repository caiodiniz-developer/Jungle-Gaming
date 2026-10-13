import { useState } from "react";
import type { Quote } from "@/api/contracts";

type Reviewed = Pick<Quote, "network" | "hash" | "total">;

const snapshot = (quote: Quote): Reviewed => ({ network: quote.network, hash: quote.hash, total: quote.total });

/**
 * Guarda a cotação que o usuário já revisou nesta rede. Se a cotação em tela
 * passar a ser outra sem ação dele (preço ou disponibilidade mudaram em tempo
 * real), `changed` fica verdadeiro e a compra exige nova confirmação.
 */
export function useQuoteReview(quote: Quote | undefined) {
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);

  // primeira cotação, ou cotação de outra rede escolhida pelo usuário: é o novo ponto de partida
  if (quote && (reviewed === null || reviewed.network !== quote.network)) {
    setReviewed(snapshot(quote));
  }

  const changed =
    quote !== undefined && reviewed !== null && reviewed.network === quote.network && reviewed.hash !== quote.hash;

  return {
    changed,
    /** Total que o usuário tinha revisado, para mostrar "de X para Y". */
    previousTotal: reviewed?.total ?? null,
    /** Confirmar é aceitar os valores em tela: eles passam a ser a cotação revisada. */
    accept() {
      if (quote) setReviewed(snapshot(quote));
    },
  };
}
