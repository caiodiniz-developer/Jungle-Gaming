/**
 * Configuração da auditoria Lighthouse (enunciado, seção 10).
 * Usada por `scripts/lighthouse.mjs`: build otimizado, cenário padrão dos mocks,
 * três medições por página e perfil, mediana por categoria.
 */
export default {
  /** Porta do `vite preview` que o script sobe para a auditoria. */
  port: 4175,
  /** Medições por página e perfil. */
  runs: 3,
  pages: [
    { id: "inicio", name: "Início", path: "/" },
    { id: "detalhe", name: "Detalhes do NFT", path: "/nft/nft-0042" },
  ],
  /** mobile = padrão do Lighthouse (Moto G Power, 4G lenta simulada, CPU 4×); desktop = preset oficial. */
  profiles: ["mobile", "desktop"],
  categories: ["performance", "accessibility", "best-practices", "seo"],
  /** Metas do enunciado (0–100). */
  thresholds: {
    performance: 90,
    accessibility: 95,
    "best-practices": 95,
    seo: 90,
  },
  /** Onde ficam os relatórios (HTML/JSON da medição mediana) e o resumo. */
  outputDir: "docs/lighthouse",
};
