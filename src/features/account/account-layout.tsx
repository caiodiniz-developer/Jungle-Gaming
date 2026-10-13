import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import activityIcon from "@/assets/icons/activity.svg";
import bagIcon from "@/assets/icons/bag.svg";
import dangerIcon from "@/assets/icons/danger.svg";
import downloadIcon from "@/assets/icons/download.svg";
import heartIcon from "@/assets/icons/heart-outline.svg";
import locationIcon from "@/assets/icons/location.svg";
import logoutIcon from "@/assets/icons/login.svg";
import userIcon from "@/assets/icons/user-outline.svg";
import { Icon } from "@/components/icon";
import { useLogout } from "@/features/auth/session";
import { cn } from "@/lib/utils";

// itens do menu da conta
const LINKS = [
  { to: "/conta/perfil", label: "Dados do perfil", icon: userIcon },
  { to: "/conta/carteiras", label: "Carteiras", icon: locationIcon },
  { to: "/conta/atividade", label: "Atividade", icon: bagIcon },
  { to: "/conta/favoritos", label: "Lista de interesse", icon: heartIcon },
  { to: "/conta/ofertas", label: "Ofertas", icon: activityIcon },
  { to: "/conta/arquivos", label: "Arquivos baixados", icon: downloadIcon },
  { to: "/conta/suporte", label: "Suporte", icon: dangerIcon },
] as const;

// estilo de cada linha do menu
const row = "flex items-center gap-3 border-l-[6px] border-transparent px-4 text-[15px] leading-[45px]";

// moldura da área da conta: menu lateral + conteúdo
export function AccountLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  function signOut() {
    logout.mutate(undefined, { onSettled: () => void navigate({ to: "/" }) });
  }

  return (
    <div className="container-page flex flex-col gap-6 pt-8 pb-10 lg:flex-row lg:items-start lg:gap-7 lg:pb-24">
      <nav aria-label="Minha conta" className="shrink-0 bg-surface py-2 lg:w-[310px]">
        <h2 className="p-2.5 text-lg leading-4 font-bold">Meu perfil</h2>
        <ul>
          {LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={cn(row, "text-highlight transition-colors hover:bg-surface-raised")}
                activeProps={{ className: "border-primary!", "aria-current": "page" }}
              >
                <Icon src={link.icon} className="size-[18px]" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hairline" />
        <button
          type="button"
          onClick={signOut}
          disabled={logout.isPending}
          className="flex h-10 w-full items-center gap-2 px-4 text-[15px] font-bold text-highlight transition-colors hover:bg-surface-raised lg:pl-[22px]"
        >
          <Icon src={logoutIcon} className="size-[18px]" />
          {logout.isPending ? "Saindo…" : "Sair"}
        </button>
      </nav>

      <div key={pathname} className="min-w-0 flex-1 animate-fade">
        {children}
      </div>
    </div>
  );
}
