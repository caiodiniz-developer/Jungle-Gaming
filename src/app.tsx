import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createQueryClient } from "@/lib/query-client";
import { RealtimeProvider } from "@/realtime/realtime-provider";
import { createAppRouter } from "@/router";

// monta a aplicação: cache, tempo real e roteador
export function renderApp(rootElement: HTMLElement) {
  const queryClient = createQueryClient();
  const router = createAppRouter({ queryClient });

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
