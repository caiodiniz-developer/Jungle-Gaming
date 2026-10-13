import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import cartIcon from "@/assets/icons/cart.svg";
import loginIcon from "@/assets/icons/login.svg";
import searchIcon from "@/assets/icons/search.svg";
import { Icon } from "@/components/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useSession } from "@/features/auth/session";
import { useCart } from "@/features/cart/use-cart";
import { cn } from "@/lib/utils";

type Section = "inicio" | "mercado" | "criadores" | "aprenda";

/** Telas do fluxo de compra destacam "Mercado"; as demais destacam "Início" (regra do Figma). */
const MARKET_PATHS = ["/nft", "/carrinho", "/pagamento", "/pedidos"];

function useActiveSection(): Section {
  const { pathname, hash } = useRouterState({ select: (state) => state.location });
  // "Mercado" leva ao catálogo da página inicial: lá, o item ativo acompanha a âncora
  if (pathname === "/" && hash === "catalogo") return "mercado";
  if (pathname.startsWith("/criadores")) return "criadores";
  if (pathname.startsWith("/aprenda")) return "aprenda";
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
      // o estado ativo é o calculado acima; sem isto o roteador marcaria os dois links de "/"
      activeOptions={{ exact: true, includeHash: true }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col gap-6 text-base leading-[21px] transition-colors hover:text-highlight",
        active ? "font-bold text-highlight" : "text-foreground",
      )}
    >
      {children}
      <span aria-hidden="true" data-active={active} className="underline-grow h-[3px] w-full bg-primary" />
    </Link>
  );
}

/**
 * Busca do header: o ícone do layout abre um campo; enviar leva ao catálogo com o
 * termo na URL (`?q=`), de qualquer página.
 */
function HeaderSearch() {
  const navigate = useNavigate();
  const currentQuery = useRouterState({
    select: (state) => (state.location.search as { q?: string }).q ?? "",
  });
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = inputRef.current?.value.trim() ?? "";
    void navigate({
      to: "/",
      search: (previous) => ({ ...previous, q: term || undefined, pagina: undefined }),
      hash: "catalogo",
    });
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-2">
      {open && (
        <>
          <label htmlFor="busca-header" className="sr-only">
            Buscar NFTs
          </label>
          <input
            id="busca-header"
            ref={inputRef}
            type="search"
            defaultValue={currentQuery}
            placeholder="Buscar NFTs"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="h-[35px] w-52 rounded-md border border-border bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-subtle focus-visible:border-primary"
          />
        </>
      )}
      <button
        type={open ? "submit" : "button"}
        onClick={open ? undefined : () => setOpen(true)}
        aria-label={open ? "Buscar" : "Abrir busca"}
        aria-expanded={open}
        className="flex text-foreground transition-colors hover:text-highlight"
      >
        <Icon src={searchIcon} className="size-5" />
      </button>
    </form>
  );
}

const accountButton =
  "flex h-[35px] items-center justify-center gap-1 rounded-md bg-primary text-base font-medium text-ink transition-colors hover:bg-highlight";

/**
 * Sem sessão, o botão "Entrar" do layout (guardando a página atual para o
 * retorno). Com sessão, vira o menu da conta: perfil, carteiras e sair.
 */
function AccountControl() {
  const { user, isAuthenticated } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });

  if (!isAuthenticated) {
    const onAuthPage = location.pathname === "/entrar" || location.pathname === "/cadastro";
    return (
      <Link
        to="/entrar"
        search={onAuthPage ? (previous) => previous : { redirect: location.href }}
        className={cn(accountButton, "w-[100px]")}
      >
        <Icon src={loginIcon} className="size-[17px]" />
        Entrar
      </Link>
    );
  }

  const name = user?.displayName ?? "Minha conta";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(accountButton, "max-w-[190px] gap-2 px-2.5")}>
        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink/15 text-xs font-bold">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>
        <span className="truncate text-sm">{name}</span>
        <span className="sr-only">— abrir menu da conta</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel className="truncate text-xs font-normal text-sand">
          {user?.email ?? "Carregando…"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/conta/perfil">Dados do perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/conta/carteiras">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: "/" }) })}
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const section = useActiveSection();
  // a linha sob o header existe só nas telas em que "Início" está ativo
  const withDivider = section !== "mercado";
  const cartCount = useCart().data?.itemCount ?? 0;

  return (
    <header className="container-page hidden pt-6 lg:block">
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
          <NavItem to="/criadores" active={section === "criadores"}>
            Criadores
          </NavItem>
          <NavItem to="/aprenda" active={section === "aprenda"}>
            Aprenda
          </NavItem>
        </nav>

        <div className="flex h-[35px] items-center gap-7">
          <HeaderSearch />

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
                key={cartCount}
                aria-hidden="true"
                className="animate-bump absolute -top-0.5 left-[13px] flex size-5 items-center justify-center rounded-full border-2 border-ink bg-primary text-[10px] leading-none font-medium text-ink"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <AccountControl />
        </div>
      </div>
      {withDivider ? <div className="hairline" /> : <div aria-hidden="true" className="h-px" />}
    </header>
  );
}
