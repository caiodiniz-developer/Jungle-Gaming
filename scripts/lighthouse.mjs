/**
 * Auditoria Lighthouse do build de produção.
 *
 *   pnpm lighthouse            (faz o build e audita)
 *
 * Para cada página e perfil de `lighthouse.config.mjs` roda N medições, calcula
 * a mediana de cada categoria e de LCP, CLS e TBT, e grava em `docs/lighthouse/`:
 *   - <página>-<perfil>.report.html / .json  → a medição mediana (por performance)
 *   - summary.json                           → todas as medições e as medianas
 *   - README.md                              → tabela de resultados, ambiente e versões
 *
 * Sai com código 1 se alguma mediana ficar abaixo da meta.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { preview } from "vite";
import config from "../lighthouse.config.mjs";

const require = createRequire(import.meta.url);
const version = (name) => require(`${name}/package.json`).version;

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Chrome do sistema; se não houver, o Chromium baixado pelo Playwright. */
async function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const { chromium } = await import("@playwright/test");
    return chromium.executablePath();
  } catch {
    return undefined;
  }
}

async function audit(url, profile, executable) {
  const chrome = await launch({
    chromePath: executable,
    chromeFlags: ["--headless=new", "--no-first-run", "--disable-extensions"],
  });
  try {
    const result = await lighthouse(
      url,
      { port: chrome.port, output: ["html", "json"], onlyCategories: config.categories, logLevel: "error" },
      profile === "desktop" ? desktopConfig : undefined,
    );
    const { lhr } = result;
    return {
      scores: Object.fromEntries(
        config.categories.map((id) => [id, Math.round((lhr.categories[id].score ?? 0) * 100)]),
      ),
      metrics: {
        lcp: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
        cls: Number(lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3)),
        tbt: Math.round(lhr.audits["total-blocking-time"].numericValue),
      },
      userAgent: lhr.environment.hostUserAgent,
      benchmarkIndex: lhr.environment.benchmarkIndex,
      report: result.report,
    };
  } finally {
    await chrome.kill();
  }
}

const server = await preview({ preview: { port: config.port, strictPort: true }, logLevel: "error" });
const base = `http://localhost:${config.port}`;
const executable = await chromePath();
await mkdir(config.outputDir, { recursive: true });

const results = [];
let chromeUserAgent = "";
let benchmarkIndex = 0;

try {
  for (const page of config.pages) {
    for (const profile of config.profiles) {
      const runs = [];
      for (let index = 0; index < config.runs; index += 1) {
        const run = await audit(base + page.path, profile, executable);
        chromeUserAgent = run.userAgent;
        benchmarkIndex = run.benchmarkIndex;
        runs.push(run);
        console.log(
          `${page.name} · ${profile} · medição ${index + 1}/${config.runs}:`,
          config.categories.map((id) => `${id} ${run.scores[id]}`).join(" | "),
          `| LCP ${run.metrics.lcp} ms | CLS ${run.metrics.cls} | TBT ${run.metrics.tbt} ms`,
        );
      }

      const medians = {
        scores: Object.fromEntries(config.categories.map((id) => [id, median(runs.map((run) => run.scores[id]))])),
        metrics: {
          lcp: median(runs.map((run) => run.metrics.lcp)),
          cls: median(runs.map((run) => run.metrics.cls)),
          tbt: median(runs.map((run) => run.metrics.tbt)),
        },
      };

      // o relatório guardado é o da medição mediana em performance
      const representative =
        runs.find((run) => run.scores.performance === medians.scores.performance) ?? runs[0];
      const [html, json] = representative.report;
      const file = path.join(config.outputDir, `${page.id}-${profile}`);
      await writeFile(`${file}.report.html`, html);
      await writeFile(`${file}.report.json`, json);

      results.push({
        page: page.name,
        path: page.path,
        profile,
        median: medians,
        runs: runs.map(({ scores, metrics }) => ({ scores, metrics })),
        report: `${page.id}-${profile}.report.html`,
      });
    }
  }
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}

const environment = {
  date: new Date().toISOString(),
  lighthouse: version("lighthouse"),
  chrome: chromeUserAgent,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: `${os.cpus()[0]?.model ?? "?"} × ${os.cpus().length}`,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  benchmarkIndex,
  server: "vite preview (build de produção, sem compressão)",
  mocks: "cenário padrão (latência simulada de 120–380 ms por requisição)",
};
await writeFile(
  path.join(config.outputDir, "summary.json"),
  JSON.stringify({ environment, thresholds: config.thresholds, results }, null, 2),
);

// ── resumo legível
const failures = [];
const rows = results.map((result) => {
  const cells = config.categories.map((id) => {
    const value = result.median.scores[id];
    if (value < config.thresholds[id]) failures.push(`${result.page} (${result.profile}): ${id} ${value} < ${config.thresholds[id]}`);
    return value < config.thresholds[id] ? `**${value}** ⚠` : String(value);
  });
  const { lcp, cls, tbt } = result.median.metrics;
  return `| ${result.page} | ${result.profile} | ${cells.join(" | ")} | ${(lcp / 1000).toFixed(2)} s | ${cls} | ${tbt} ms | [HTML](${result.report}) |`;
});
const allRuns = results.flatMap((result) =>
  result.runs.map(
    (run, index) =>
      `| ${result.page} | ${result.profile} | ${index + 1} | ${config.categories.map((id) => run.scores[id]).join(" | ")} | ${run.metrics.lcp} ms | ${run.metrics.cls} | ${run.metrics.tbt} ms |`,
  ),
);

const notesFile = path.join(config.outputDir, "ANALISE.md");
const notes = await readFile(notesFile, "utf8").catch(() => "");

const markdown = `# Auditoria Lighthouse

Gerado por \`pnpm lighthouse\` (configuração em \`lighthouse.config.mjs\`). Não edite: o arquivo é reescrito a cada execução. A análise dos resultados fica em [ANALISE.md](ANALISE.md).

## Medianas (${config.runs} medições por página e perfil)

Metas: Performance ≥ ${config.thresholds.performance}, Accessibility ≥ ${config.thresholds.accessibility}, Best Practices ≥ ${config.thresholds["best-practices"]}, SEO ≥ ${config.thresholds.seo}.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | Relatório |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

${failures.length ? `Abaixo da meta:\n\n${failures.map((item) => `- ${item}`).join("\n")}` : "Todas as medianas atingem as metas."}

## Todas as medições

| Página | Perfil | Medição | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${allRuns.join("\n")}

## Ambiente e condições

| Item | Valor |
| --- | --- |
| Data | ${environment.date} |
| Lighthouse | ${environment.lighthouse} |
| Chrome | ${environment.chrome} |
| Node.js | ${environment.node} |
| Sistema | ${environment.os} |
| CPU | ${environment.cpu} |
| Memória | ${environment.memoryGb} GB |
| Benchmark index do Lighthouse | ${environment.benchmarkIndex} |
| Servidor | ${environment.server} |
| Dados | ${environment.mocks} |
| Perfil mobile | padrão do Lighthouse: Moto G Power emulado, rede 4G lenta simulada (RTT 150 ms, 1,6 Mbps), CPU 4× mais lenta |
| Perfil desktop | preset \`desktop\` do Lighthouse: 1350 × 940, rede 40 ms / 10 Mbps, CPU sem redução |

A auditoria carrega a aplicação inteira, como publicada: fontes, imagens, a camada de mocks (MSW) e a conexão Socket.IO. Nada é desligado para a medição.
${notes ? "" : "\n> Falta o arquivo ANALISE.md com a interpretação dos resultados.\n"}`;
await writeFile(path.join(config.outputDir, "README.md"), markdown);

console.log(`\nResumo em ${path.join(config.outputDir, "README.md")}`);
if (failures.length) {
  console.error("Abaixo da meta:\n" + failures.map((item) => `  - ${item}`).join("\n"));
  process.exitCode = 1;
}
