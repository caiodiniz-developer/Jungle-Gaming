import { createRootRouteWithContext, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { useShowMobileTabBar } from "@/components/layout/use-show-mobile-tab-bar";
import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { SessionWatcher } from "@/features/auth/session-watcher";
import { pageTitle } from "@/lib/page-title";
import { dismissShell } from "@/lib/shell";
import { useIsDesktop } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { RouterContext } from "@/router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFound />,
});

/**
 * Duas molduras, seguindo o Figma: a partir de 1024px, header e rodapé; abaixo
 * disso, as telas ocupam a altura toda e a navegação fica na barra inferior.
 */
function RootLayout() {
  const hasTabBar = useShowMobileTabBar();
  const isDesktop = useIsDesktop();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const settled = useRouterState({ select: (state) => state.status === "idle" });
  const section = pathname.split("/")[1] ?? "";

  // A primeira dobra pré-renderizada sai quando a rota termina de carregar. Início e
  // detalhe do NFT a removem por conta própria, no momento em que têm o mesmo conteúdo.
  useLayoutEffect(() => {
    if (settled && pathname !== "/" && !pathname.startsWith("/nft/")) dismissShell();
  }, [settled, pathname]);

  // cada tela tem seu título; o detalhe do NFT troca o seu pelo nome da obra quando os dados chegam
  useEffect(() => {
    if (!pathname.startsWith("/nft/")) document.title = pageTitle(pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      {/* header e rodapé só existem na moldura desktop: no mobile nem são montados */}
      {isDesktop && <Header />}
      {/* altura mínima de uma tela: o rodapé fica abaixo da dobra e não é empurrado quando os dados chegam */}
      <main
        id="conteudo"
        tabIndex={-1}
        className={cn("min-h-dvh flex-1 outline-none", hasTabBar && "max-lg:pb-[110px]")}
      >
        {/* fade a cada troca de seção; só opacidade, para não deslocar as barras fixas */}
        <div key={section} className="animate-fade">
          <Outlet />
        </div>
      </main>
      {isDesktop && <Footer />}
      <MobileTabBar />
      <SessionWatcher />
      <Toaster />
    </div>
  );
}
