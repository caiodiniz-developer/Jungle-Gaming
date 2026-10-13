import { Link, useRouterState } from "@tanstack/react-router";
import cartIcon from "@/assets/icons/cart.svg";
import loginIcon from "@/assets/icons/login.svg";
import searchIcon from "@/assets/icons/search.svg";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type Section = "inicio" | "mercado";

/** Telas do fluxo de compra destacam "Mercado"; as demais destacam "Início" (regra do Figma). */
const MARKET_PATHS = ["/nft", "/carrinho", "/pagamento", "/pedidos"];

function useActiveSection(): Section {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return MARKET_PATHS.some((path) => pathname.startsWith(path)) ? "mercado" : "inicio";
}

function NavItem({
  active,
  children,
  ...linkProps
}: { active: boolean; children: React.ReactNode } & Pick<
  React.ComponentProps<typeof Link>,
  "to" | "hash"
>) {
  return (
    <Link
      {...linkProps}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col gap-6 text-base leading-[21px] transition-colors hover:text-highlight",
        active ? "font-bold text-highlight" : "text-foreground",
      )}
    >
      {children}
      <span aria-hidden="true" className={cn("h-[3px] w-full", active && "bg-primary")} />
    </Link>
  );
}

/** Seções editoriais estão fora do escopo da entrega: aparecem como no layout, sem navegar. */
function NavPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-disabled="true"
      title="Seção fora do escopo desta entrega"
      className="cursor-not-allowed text-base leading-[21px] text-foreground/60"
    >
      {children}
    </span>
  );
}

export function Header() {
  const section = useActiveSection();
  // a linha sob o header existe só nas telas em que "Início" está ativo
  const withDivider = section === "inicio";
  // contagem real entra junto com o carrinho; o header já trata os dois estados
  const cartCount: number = 0;

  return (
    <header className="container-page pt-6">
      <div className="flex items-start justify-between gap-4">
        <Link
          to="/"
          aria-label="Kurio — página inicial"
          className="flex h-[34px] items-center text-sm font-bold tracking-[1.4px] md:w-40"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden items-start gap-10 lg:flex">
          <NavItem to="/" active={section === "inicio"}>
            Início
          </NavItem>
          <NavItem to="/" hash="catalogo" active={section === "mercado"}>
            Mercado
          </NavItem>
          <NavPlaceholder>Criadores</NavPlaceholder>
          <NavPlaceholder>Aprenda</NavPlaceholder>
        </nav>

        <div className="flex h-[35px] items-center gap-7">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Buscar NFTs"
            className="flex text-foreground transition-colors hover:text-highlight"
          >
            <Icon src={searchIcon} className="size-5" />
          </Link>

          <Link
            to="/carrinho"
            aria-label={
              cartCount > 0 ? `Carrinho, ${cartCount} ${cartCount === 1 ? "item" : "itens"}` : "Carrinho"
            }
            className="relative flex text-foreground transition-colors hover:text-highlight"
          >
            <Icon src={cartIcon} className="size-6" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 left-[13px] flex size-5 items-center justify-center rounded-full border-2 border-ink bg-primary text-[10px] leading-none font-medium text-ink"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <Link
            to="/entrar"
            className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-md bg-primary text-base font-medium text-ink transition-colors hover:bg-highlight"
          >
            <Icon src={loginIcon} className="size-[17px]" />
            Entrar
          </Link>
        </div>
      </div>
      {withDivider ? <div className="hairline" /> : <div aria-hidden="true" className="h-px" />}
    </header>
  );
}
