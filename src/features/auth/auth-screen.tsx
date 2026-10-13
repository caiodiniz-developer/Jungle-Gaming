import { Link, useRouter } from "@tanstack/react-router";
import closeIcon from "@/assets/icons/close.svg";
import { Icon } from "@/components/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthSwitchLink, LoginForm, RegisterForm } from "@/features/auth/auth-forms";
import { safeRedirect } from "@/features/auth/guards";
import { NftCardSkeleton } from "@/features/catalog/nft-card";
import { Hero } from "@/features/catalog/home-sections";
import { useIsDesktop } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

type AuthScreenProps = {
  mode: "login" | "register";
  redirect?: string;
};

const COPY = {
  login: {
    title: "Entrar",
    mobileTitle: "Entrar",
    description: "Entre para gerenciar sua carteira, coleção e perfil de criador.",
    submit: "Entrar",
    mobileSubmit: "Entrar",
  },
  register: {
    title: "Criar conta",
    mobileTitle: "Criar perfil de colecionador",
    description: "Crie seu perfil de colecionador e conecte uma carteira quando quiser.",
    submit: "Criar conta",
    mobileSubmit: "Criar perfil",
  },
} as const;

/**
 * Login e cadastro. No desktop são um diálogo modal sobre a página (como no
 * layout); no mobile, uma tela inteira. Ao concluir — ou ao fechar — o usuário
 * volta ao endereço em que estava (`?redirect=`).
 */
export function AuthScreen({ mode, redirect }: AuthScreenProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const copy = COPY[mode];
  const destination = safeRedirect(redirect);

  const goToDestination = () => void router.navigate({ href: destination, replace: true });
  // fechar sem entrar não pode devolver o usuário a uma rota privada (voltaria ao login)
  const close = () => void router.navigate({ to: "/", replace: true });

  const Form = mode === "login" ? LoginForm : RegisterForm;

  if (!isDesktop) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-10 px-7 pt-20 pb-6">
        <Link
          to="/"
          aria-label="Kurio — página inicial"
          className="flex h-[136px] items-center justify-center text-[32px] font-bold tracking-[3.2px]"
        >
          KURIO
        </Link>
        <h1 className="text-center text-lg leading-4 font-bold">{copy.mobileTitle}</h1>
        <Form onSuccess={goToDestination} submitLabel={copy.mobileSubmit} />
        <AuthSwitchLink mode={mode} redirect={redirect} />
      </div>
    );
  }

  return (
    <>
      {/* página de fundo do layout: decorativa e inerte enquanto o diálogo está aberto */}
      <div inert aria-hidden="true" className="flex flex-col gap-24 pt-8 pb-24">
        <Hero />
        <div className="container-page grid grid-cols-3 gap-[34px] xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </div>
      </div>

      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          showCloseButton={false}
          // o foco inicial vai para o primeiro campo, não para o botão de fechar
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
          className="w-[500px] max-w-[500px] gap-0 rounded-none border-0 border-b-[10px] border-primary bg-surface p-0 pt-12 pb-10 sm:max-w-[500px]"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="absolute top-2.5 right-3 flex size-8 items-center justify-center text-primary transition-colors hover:text-highlight"
          >
            <Icon src={closeIcon} className="size-[18px]" />
          </button>

          <div className="flex flex-col items-center gap-10 px-12">
            <nav aria-label="Entrar ou criar conta" className="flex items-center gap-2 text-xl leading-4 font-medium">
              {(["login", "register"] as const).map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                  {index === 1 && <span aria-hidden="true" className="h-4 w-px bg-coral" />}
                  <Link
                    to={item === "login" ? "/entrar" : "/cadastro"}
                    search={{ redirect }}
                    replace
                    aria-current={item === mode ? "page" : undefined}
                    className={cn(
                      "transition-colors hover:text-highlight",
                      item === mode ? "text-highlight" : "text-foreground",
                    )}
                  >
                    {COPY[item].title}
                  </Link>
                </span>
              ))}
            </nav>
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <DialogDescription className="text-center text-[13px] leading-4 text-foreground">
              {copy.description}
            </DialogDescription>
          </div>

          <div className="pt-6">
            <Form onSuccess={goToDestination} submitLabel={copy.submit} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
