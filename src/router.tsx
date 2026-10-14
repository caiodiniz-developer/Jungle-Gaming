import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export type RouterContext = {
  queryClient: QueryClient;
};

type RouterOptions = {
  /** Histórico em memória, usado pela pré-renderização no build; no navegador vale o do endereço. */
  history?: RouterHistory;
};

// cria o roteador da aplicação
export function createAppRouter(context: RouterContext, { history }: RouterOptions = {}) {
  const inBrowser = typeof window !== "undefined";
  return createRouter({
    routeTree,
    context,
    history,
    defaultPreload: "intent",
    // o cache é do TanStack Query; o router não mantém cópia própria dos dados
    defaultPreloadStaleTime: 0,
    scrollRestoration: inBrowser,
    // âncoras rolam com suavidade, exceto para quem pede menos movimento
    defaultHashScrollIntoView:
      !inBrowser || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? true
        : { behavior: "smooth" },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
