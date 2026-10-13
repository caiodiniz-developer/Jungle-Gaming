import { createRootRouteWithContext, Outlet, useRouterState } from "@tanstack/react-router";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { useShowMobileTabBar } from "@/components/layout/use-show-mobile-tab-bar";
import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { SessionWatcher } from "@/features/auth/session-watcher";
import { cn } from "@/lib/utils";
import type { RouterContext } from "@/router";

// rota raiz: moldura comum a todas as telas
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
  const section = useRouterState({ select: (state) => state.location.pathname.split("/")[1] ?? "" });

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Header />
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
      <div className="hidden lg:block">
        <Footer />
      </div>
      <MobileTabBar />
      <SessionWatcher />
      <Toaster />
    </div>
  );
}
