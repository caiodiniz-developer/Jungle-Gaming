import { useRouterState } from "@tanstack/react-router";

/** Telas com ação fixa no rodapé (compra, pagamento, login) não exibem a barra, como no layout. */
const HIDDEN_ON = ["/nft", "/carrinho", "/pagamento", "/pedidos", "/entrar", "/cadastro"];

export function useShowMobileTabBar(): boolean {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return !HIDDEN_ON.some((path) => pathname.startsWith(path));
}
