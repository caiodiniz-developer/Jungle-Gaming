import { Link, type LinkProps } from "@tanstack/react-router";
import chevronLeftIcon from "@/assets/icons/chevron-left.svg";
import { Icon } from "@/components/icon";

type MobilePageHeaderProps = {
  title: string;
  /** Destino do botão de voltar. */
  backTo: LinkProps["to"];
  backLabel: string;
};

/** Cabeçalho das telas mobile do fluxo de compra: voltar (35px) + título centralizado. */
export function MobilePageHeader({ title, backTo, backLabel }: MobilePageHeaderProps) {
  return (
    <div className="relative flex min-h-[35px] items-center justify-center">
      <Link
        to={backTo}
        aria-label={backLabel}
        className="absolute left-0 flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-sand"
      >
        <Icon src={chevronLeftIcon} className="size-3.5 rotate-90" />
      </Link>
      {/* abaixo de 400px o título encolhe um ponto para caber numa linha, como no layout de 414px */}
      <h1 className="px-11 text-center text-xl leading-6 font-bold max-[400px]:text-lg max-[400px]:tracking-tight">
        {title}
      </h1>
    </div>
  );
}
