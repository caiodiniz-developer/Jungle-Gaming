/**
 * Grava no build a primeira dobra mobile pré-renderizada.
 *
 *   vite build && vite build --ssr src/prerender/render.tsx && node scripts/prerender.mjs
 *
 * O HTML de cada página vai dentro de um <template> em seu index.html, e um
 * script embutido o coloca na tela antes da primeira pintura quando a página é
 * aberta num viewport mobile. A aplicação monta por baixo e o remove quando a
 * tela está pronta (src/lib/shell.ts).
 *
 * - `/`          → dist/index.html (também é o fallback das demais rotas; o
 *                  script confere o caminho antes de mostrar)
 * - `/nft/<id>`  → dist/nft/<id>.html (servido em `/nft/<id>` pelo `vite preview` e pelos
 *                  hosts estáticos com URLs sem extensão; ver vercel.json)
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DIST = "dist";
const SSR_DIR = "node_modules/.prerender";
const ROOT = '<div id="root"></div>';

// Durante a renderização nenhuma consulta deve concluir: as telas saem no
// estado "carregando", exceto onde o dado foi semeado de propósito.
globalThis.fetch = () => new Promise(() => {});

const { prerenderPages } = await import(pathToFileURL(path.resolve(SSR_DIR, "render.js")).href);

/**
 * Colocado logo depois do <template>. Mostra a página pré-renderizada só se:
 * o endereço é o dela; o viewport é mobile (a variante renderizada); e, quando
 * ela contém dados, o banco simulado ainda não existe neste navegador — depois
 * disso preço e disponibilidade podem ter mudado, e vale só a resposta da API.
 * Se a aplicação não assumir em 8 s, a página sai sozinha.
 */
const GATE = [
  "<script>(function(){",
  'var t=document.getElementById("shell-template");if(!t)return;',
  'var p=location.pathname.replace(/\\/+$/,"")||"/";',
  'if(p!==t.getAttribute("data-path")||matchMedia("(min-width:1024px)").matches)return;',
  'if(t.hasAttribute("data-snapshot")){try{if(localStorage.getItem("kurio.mock.db")||/[?&]cenario=/.test(location.search))return}catch(e){return}}',
  'var s=document.createElement("div");s.id="shell";s.setAttribute("aria-hidden","true");s.setAttribute("inert","");',
  "s.appendChild(t.content);t.parentNode.insertBefore(s,t);",
  "setTimeout(function(){s.remove()},8000)",
  "})()</script>",
].join("");

/** O conteúdo é decorativo até a aplicação assumir: sem ids, rótulos ligados ou scripts que colidam com os dela. */
const LINKING_ATTRIBUTES =
  /\s(?:id|for|data-testid|aria-labelledby|aria-describedby|aria-controls|tabindex)="[^"]*"/g;

function sanitize(html) {
  return (
    html
      .replace(/<script\b[\s\S]*?<\/script>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      // sem animações de entrada: o conteúdo já nasce visível (e conta como primeira pintura)
      .replace(/\banimate-(?:fade|rise|pop|bump|tick|flash|draw)\b ?/g, "")
      // dentro de um <svg> os ids ligam gradientes e máscaras: ficam como estão
      .split(/(<svg\b[\s\S]*?<\/svg>)/)
      .map((part) => (part.startsWith("<svg") ? part : part.replace(LINKING_ATTRIBUTES, "")))
      .join("")
  );
}

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const template = await readFile(path.join(DIST, "index.html"), "utf8");
if (!template.includes(ROOT)) throw new Error(`dist/index.html sem ${ROOT}`);

const pages = await prerenderPages();
let bytes = 0;

for (const page of pages) {
  const shell = `<template id="shell-template" data-path="${page.path}"${page.snapshot ? " data-snapshot" : ""}>${sanitize(page.html)}</template>${GATE}`;
  let html = template.replace(ROOT, () => `${shell}\n    ${ROOT}`);
  if (page.title) html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(page.title)}</title>`);
  if (page.description) {
    html = html.replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      () => `<meta name="description" content="${escapeHtml(page.description)}" />`,
    );
  }

  const file = path.join(DIST, page.path === "/" ? "index.html" : `${page.path}.html`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
  bytes += html.length;
}

await rm(SSR_DIR, { recursive: true, force: true });
console.log(`pré-renderização: ${pages.length} páginas, ${(bytes / 1024).toFixed(0)} kB`);
// consultas e temporizadores da renderização ficam pendentes de propósito
process.exit(0);
