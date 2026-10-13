import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // lista de sufixos públicos usada só pelos cookies do MSW (ver o arquivo)
      tldts: fileURLToPath(new URL("./src/mocks/tldts-stub.ts", import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
});
