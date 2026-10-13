import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "playwright-report",
      "test-results",
      "public/mockServiceWorker.js",
      "src/routeTree.gen.ts",
      ".reference",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // rotas e primitivos de UI exportam a rota/variantes junto do componente
    files: ["src/routes/**/*.tsx", "src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["*.{js,ts}", "scripts/**/*.{js,mjs,ts}", "tests/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);
