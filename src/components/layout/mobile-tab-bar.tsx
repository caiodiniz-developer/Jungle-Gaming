import { Link, useRouterState } from "@tanstack/react-router";
import heartIcon from "@/assets/icons/heart-filled.svg";
import homeIcon from "@/assets/icons/home.svg";
import scan1 from "@/assets/icons/scan-1.svg";
import scan2 from "@/assets/icons/scan-2.svg";
import scan3 from "@/assets/icons/scan-3.svg";
import scan4 from "@/assets/icons/scan-4.svg";
import scan5 from "@/assets/icons/scan-5.svg";
import shopIcon from "@/assets/icons/shop.svg";
import tabFab from "@/assets/icons/tab-fab.svg";
import tabBarShape from "@/assets/icons/tabbar-shape.svg";
import userIcon from "@/assets/icons/user.svg";
import { Icon } from "@/components/icon";
import { useCart } from "@/features/cart/use-cart";
import { useSessionToken } from "@/lib/use-session-token";
import { useShowMobileTabBar } from "@/components/layout/use-show-mobile-tab-bar";
import { cn } from "@/lib/utils";

const item = "relative flex size-11 items-center justify-center transition-colors";


/**
 * Barra de navegação inferior das telas mobile (abaixo de 1024px), com o
 * recorte central do layout. Favoritos e leitura de código são telas fora do
 * escopo: aparecem desabilitados em vez de simular uma navegação.
 */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const cartCount = useCart().data?.itemCount ?? 0;
  const signedIn = useSessionToken() !== null;
  const visible = useShowMobileTabBar();

  const color = (active: boolean) => (active ? "text-highlight" : "text-sand");

  if (!visible) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto h-[95px] max-w-[640px] lg:hidden"
    >
      <img
        src={tabBarShape}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-[7.25%] -top-[40px] h-[155px] w-[114.5%] max-w-none"
      />

      <span
        aria-disabled="true"
        title="Leitura de código fora do escopo desta entrega"
        className="absolute -top-[31px] left-1/2 flex size-[65px] -translate-x-1/2 items-center justify-center opacity-90"
      >
        <img src={tabFab} alt="" aria-hidden="true" className="absolute inset-0 size-full" />
        <span aria-hidden="true" className="relative grid size-[27px] grid-cols-2 place-items-center gap-1.5">
          <img src={scan5} alt="" className="size-[10px]" />
          <img src={scan3} alt="" className="size-[10px]" />
          <img src={scan2} alt="" className="size-[10px]" />
          <img src={scan4} alt="" className="size-[10px]" />
          <img src={scan1} alt="" className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2" />
        </span>
        <span className="sr-only">Ler código (indisponível)</span>
      </span>

      <ul className="relative flex h-full items-center justify-between px-[7%] pt-3">
        <li>
          <Link to="/" aria-label="Início" aria-current={pathname === "/" ? "page" : undefined} className={cn(item, color(pathname === "/"))}>
            <Icon src={homeIcon} className="size-5" />
          </Link>
        </li>
        <li className="mr-[22%]">
          <span
            role="link"
            aria-disabled="true"
            aria-label="Favoritos (indisponível)"
            title="Lista de favoritos fora do escopo desta entrega"
            className={cn(item, "cursor-not-allowed text-sand/50")}
          >
            <Icon src={heartIcon} className="size-5" />
          </span>
        </li>
        <li>
          <Link
            to="/carrinho"
            aria-label={cartCount > 0 ? `Carrinho, ${cartCount} ${cartCount === 1 ? "item" : "itens"}` : "Carrinho"}
            aria-current={pathname.startsWith("/carrinho") ? "page" : undefined}
            className={cn(item, color(pathname.startsWith("/carrinho")))}
          >
            <Icon src={shopIcon} className="size-5" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium text-ink"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            to={signedIn ? "/conta/perfil" : "/entrar"}
            aria-label={signedIn ? "Minha conta" : "Entrar"}
            aria-current={pathname.startsWith("/conta") || pathname === "/entrar" ? "page" : undefined}
            className={cn(item, color(pathname.startsWith("/conta") || pathname === "/entrar"))}
          >
            <Icon src={userIcon} className="size-5" />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
