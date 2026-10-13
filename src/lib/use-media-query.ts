import { useCallback, useSyncExternalStore } from "react";

/** Reage a uma media query. Usado quando o layout muda de estrutura, não só de estilo. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** A partir de 1024px vale a moldura desktop (header e rodapé); abaixo, a mobile. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
