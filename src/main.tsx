import "@fontsource-variable/roboto-mono/wght.css";
import "./styles.css";

import { env } from "@/lib/env";

// liga a camada de mocks (MSW), se habilitada
async function startMocksIfEnabled() {
  // Com VITE_ENABLE_MOCKS=false os mocks nem chegam a ser baixados.
  if (!env.enableMocks) return;
  const { startMocks } = await import("@/mocks/browser");
  await startMocks();
}

// inicia os mocks e depois a aplicação
async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Elemento #root não encontrado em index.html");

  // Os dois downloads acontecem em paralelo, mas a aplicação só é renderizada
  // (e só então faz a primeira requisição) depois que os mocks estão ativos.
  // O socket.io-client fica fora deste caminho: ele guarda a referência de
  // `WebSocket` ao ser avaliado, então é carregado sob demanda, já com o MSW
  // no lugar (ver src/realtime/socket.ts). Nenhum módulo importado
  // estaticamente por "@/app" pode importar "socket.io-client".
  const [, { renderApp }] = await Promise.all([startMocksIfEnabled(), import("@/app")]);
  renderApp(rootElement);
}

void bootstrap();
