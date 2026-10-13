import { Link } from "@tanstack/react-router";

/** Trilha "Início / Mercado / <página atual>" das telas desktop do fluxo de compra. */
export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Você está em" className="text-[15px] leading-4 font-bold">
      <ol className="flex gap-2">
        <li>
          <Link to="/" className="hover:text-highlight">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-highlight">
            Mercado
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
