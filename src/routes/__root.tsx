import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import type { RouterContext } from "@/router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFound />,
});

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
