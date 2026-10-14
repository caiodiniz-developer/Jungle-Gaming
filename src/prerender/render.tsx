/**
 * Pré-renderização da primeira dobra mobile, executada no build
 * (scripts/prerender.mjs). Usa os mesmos componentes, rotas e dados da
 * aplicação: nada aqui é HTML escrito à mão.
 *
 * - Início: a tela como aparece antes da resposta da API (banner, abas, grade
 *   em carregamento, barra inferior). Não depende de dados.
 * - Detalhe de cada NFT: a tela com o detalhe das fixtures, o mesmo que a API
 *   simulada devolve num banco recém-criado.
 *
 * No servidor `useIsDesktop` devolve falso, então sai a variante mobile.
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { prerender } from "react-dom/static";
import type { NftDetail } from "@/api/contracts";
import { createQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { db, initDb } from "@/mocks/db";
import { toNftDetail } from "@/mocks/domain/catalog";
import { createAppRouter } from "@/router";

export type PrerenderedPage = {
  /** Caminho da rota, sem barra final. */
  path: string;
  html: string;
  title?: string;
  description?: string;
  /** A página mostra dados (não só a moldura): vale apenas enquanto o banco simulado é o inicial. */
  snapshot: boolean;
};

async function renderPath(path: string, detail?: NftDetail): Promise<string> {
  const queryClient = createQueryClient();
  if (detail) queryClient.setQueryData(queryKeys.nfts.detail(detail.id), detail);

  const router = createAppRouter({ queryClient }, { history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load();

  const app = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  // A primeira passada espera o que ainda suspende (componentes de rota carregados
  // sob demanda). Com tudo resolvido, a segunda sai num bloco só, sem os trechos
  // adiados e scripts que o formato de streaming do React usaria.
  await new Response((await prerender(app)).prelude).text();
  const html = renderToString(app);
  queryClient.clear();
  return html;
}

export async function prerenderPages(): Promise<PrerenderedPage[]> {
  await initDb();
  const pages: PrerenderedPage[] = [{ path: "/", html: await renderPath("/"), snapshot: false }];

  for (const nft of db().nfts) {
    const detail = toNftDetail(nft);
    pages.push({
      path: `/nft/${nft.id}`,
      html: await renderPath(`/nft/${nft.id}`, detail),
      title: `${detail.name} — Kurio`,
      description: detail.summary,
      snapshot: true,
    });
  }
  return pages;
}
