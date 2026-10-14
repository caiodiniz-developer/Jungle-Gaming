const SITE = "Kurio";
export const HOME_TITLE = "Kurio — Marketplace de NFTs";

/** Título de cada tela, do caminho mais específico para o mais geral. */
const TITLES: [prefix: string, title: string][] = [
  ["/carrinho", "Carrinho de NFTs"],
  ["/pagamento", "Pagamento"],
  ["/pedidos", "Pedido"],
  ["/entrar", "Entrar"],
  ["/cadastro", "Criar conta"],
  ["/conta/perfil", "Perfil do colecionador"],
  ["/conta/carteiras", "Carteiras"],
  ["/conta/atividade", "Atividade"],
  ["/conta/favoritos", "Lista de interesse"],
  ["/conta/arquivos", "Arquivos baixados"],
  ["/conta/ofertas", "Ofertas"],
  ["/conta/suporte", "Suporte"],
  ["/conta", "Minha conta"],
  ["/nft", "Detalhes do NFT"],
  ["/criadores", "Criadores"],
  ["/aprenda", "Aprenda"],
  ["/ajuda", "Central de ajuda"],
];

export function withSite(title: string): string {
  return `${title} — ${SITE}`;
}

/**
 * Título do documento para um caminho. Cada tela tem o seu, para que abas,
 * histórico e leitores de tela digam onde o usuário está.
 */
export function pageTitle(pathname: string): string {
  if (pathname === "/") return HOME_TITLE;
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return withSite(match ? match[1] : "Página não encontrada");
}
