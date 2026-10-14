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

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Resolve quando as imagens principais já estão na tela. */
async function mainImagesPainted(images: HTMLImageElement[]): Promise<void> {
  if (images.length > 0 && PerformanceObserver.supportedEntryTypes.includes("element")) {
    // Element Timing avisa depois da pintura de cada imagem marcada com `elementtiming`
    await new Promise<void>((resolve) => {
      let pending = images.length;
      const observer = new PerformanceObserver((list) => {
        pending -= list.getEntries().length;
        if (pending > 0) return;
        observer.disconnect();
        resolve();
      });
      observer.observe({ type: "element", buffered: true });
    });
  } else {
    // sem a API: imagem decodificada e dois quadros de folga
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    await nextFrame();
    await nextFrame();
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Quando o HTML já traz a primeira dobra pré-renderizada, o navegador a pinta
 * (com a imagem principal) antes de começar a baixar e executar a aplicação: o
 * conteúdo aparece primeiro. A espera tem teto de 1,5 s. Em aba oculta não há
 * quadros, então não se espera.
 */
function firstPaintOfShell(): Promise<void> {
  const shell = document.getElementById("shell");
  if (!shell || document.hidden) return Promise.resolve();
  const images = [...shell.querySelectorAll<HTMLImageElement>("img[elementtiming]")];
  const limit = new Promise<void>((resolve) => setTimeout(resolve, 1500));
  return Promise.race([mainImagesPainted(images), limit]);
}

// inicia os mocks e depois a aplicação
async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Elemento #root não encontrado em index.html");
  await firstPaintOfShell();

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
