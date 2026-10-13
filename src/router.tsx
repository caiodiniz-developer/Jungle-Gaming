import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export type RouterContext = {
  queryClient: QueryClient;
};

export function createAppRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    context,
    defaultPreload: "intent",
    // o cache é do TanStack Query; o router não mantém cópia própria dos dados
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // âncoras rolam com suavidade, exceto para quem pede menos movimento
    defaultHashScrollIntoView: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? true
      : { behavior: "smooth" },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
