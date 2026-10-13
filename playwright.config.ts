import { defineConfig } from "@playwright/test";

const PORT = 4173;

/**
 * Os testes rodam contra o build otimizado (`vite preview`), com a mesma camada
 * de mocks da demonstração. Cada teste usa um contexto novo do navegador:
 * armazenamento vazio, portanto banco simulado no estado inicial.
 */
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // cada teste sobe um navegador com service worker e WebSocket: muitos em paralelo esgotam a máquina
  workers: process.env.CI ? 2 : 3,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  // relatório HTML sempre; trace e screenshot das falhas
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // conteúdo já no lugar: sem esperar animações de entrada (o movimento tem teste próprio)
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      // fluxos principais e regressão visual no viewport do layout mobile
      name: "mobile",
      testMatch: /(mobile|visual)\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm preview",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
