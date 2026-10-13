import "@fontsource-variable/roboto-mono/wght.css";
import "./styles.css";

import { env } from "@/lib/env";

async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Elemento #root não encontrado em index.html");

  // A camada de mocks precisa estar ativa antes de qualquer código da aplicação:
  // o socket.io-client guarda a referência de `WebSocket` no momento em que o
  // módulo é avaliado, então ele só pode ser carregado depois que o MSW a
  // substituiu. Por isso o app entra por import dinâmico, após `startMocks()`.
  // Com VITE_ENABLE_MOCKS=false os mocks nem chegam a ser baixados.
  if (env.enableMocks) {
    const { startMocks } = await import("@/mocks/browser");
    await startMocks();
  }

  const { renderApp } = await import("@/app");
  renderApp(rootElement);
}

void bootstrap();
