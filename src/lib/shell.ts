/**
 * Primeira dobra pré-renderizada no build (ver src/prerender.tsx). O HTML já
 * chega com ela, por cima de `#root`; a aplicação a remove quando a tela
 * correspondente está pronta, e o usuário não vê a troca.
 */
export function dismissShell() {
  if (typeof document === "undefined") return;
  document.getElementById("shell")?.remove();
}
