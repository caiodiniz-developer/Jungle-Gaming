import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Testes unitários da lógica pura (sem navegador): aritmética de ETH, filtro
 * de eventos, idempotência, estado da URL e regras de preço da simulação.
 * Os fluxos de tela são cobertos pelo Playwright, em `tests/`.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
