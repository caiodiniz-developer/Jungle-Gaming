/**
 * Substituto do pacote `tldts` no bundle (alias em vite.config.ts).
 *
 * O MSW depende do `tough-cookie`, que usa o `tldts` para validar o domínio de
 * cookies contra a lista de sufixos públicos — uma tabela de ~128 kB. A
 * simulação desta entrega não usa cookies (a sessão trafega em
 * `Authorization: Bearer`), então a tabela seria peso morto no carregamento.
 * Aqui o "domínio registrável" é aproximado pelos dois últimos rótulos do host,
 * o que basta para o armazenamento de cookies do MSW seguir funcionando.
 */
export function getDomain(hostname: string): string | null {
  const host = hostname.replace(/^[a-z]+:\/\//i, "").split(/[/:?#]/)[0] ?? "";
  if (!host) return null;
  const labels = host.split(".");
  return labels.length <= 2 ? host : labels.slice(-2).join(".");
}
