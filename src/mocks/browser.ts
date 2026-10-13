import { setupWorker } from "msw/browser";
import { isScenarioId, setScenario } from "@/mocks/config";
import { mockControl } from "@/mocks/control";
import { initDb, resetDb } from "@/mocks/db";
import { resumePendingOrders } from "@/mocks/domain/orders";
import { accountHandlers } from "@/mocks/handlers/account";
import { authHandlers } from "@/mocks/handlers/auth";
import { cartHandlers } from "@/mocks/handlers/cart";
import { catalogHandlers } from "@/mocks/handlers/catalog";
import { orderHandlers } from "@/mocks/handlers/orders";
import { realtimeHandlers } from "@/mocks/realtime";

const worker = setupWorker(
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...realtimeHandlers,
);

/**
 * Parâmetros de URL para reproduzir situações sem abrir o painel:
 * `?cenario=<id>` seleciona um cenário e `?reset-mocks` restaura os dados.
 * São consumidos e removidos da URL antes de o roteador iniciar.
 */
async function applyUrlOptions() {
  const url = new URL(window.location.href);
  const scenario = url.searchParams.get("cenario");
  const reset = url.searchParams.has("reset-mocks");
  if (scenario === null && !reset) return;

  if (reset) await resetDb();
  if (isScenarioId(scenario)) setScenario(scenario);

  url.searchParams.delete("cenario");
  url.searchParams.delete("reset-mocks");
  window.history.replaceState(window.history.state, "", url);
}

export async function startMocks() {
  await initDb();
  await applyUrlOptions();
  window.__kurioMocks = mockControl;

  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: !import.meta.env.DEV,
    serviceWorker: { url: "/mockServiceWorker.js" },
  });

  // pedidos que estavam pendentes antes do refresh voltam a ser processados
  resumePendingOrders();
}
