import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type IconProps = {
  /** URL do SVG exportado do Figma (import de `@/assets/icons/*.svg`). */
  src: string;
  className?: string;
  /** Nome acessível. Sem ele o ícone é decorativo e fica oculto de leitores de tela. */
  label?: string;
};

/**
 * Renderiza um SVG do Figma como máscara: o desenho vem do arquivo original e a
 * cor vem de `currentColor`, o que permite estados de hover/ativo sem duplicar assets.
 * Ícones multicoloridos (logos) devem usar `<img>` diretamente.
 */
export function Icon({ src, className, label }: IconProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("icon-mask inline-block size-5 shrink-0 bg-current", className)}
      // o desenho vai numa variável: a regra da máscara fica uma vez só, no CSS
      style={{ "--icon": `url("${src}")` } as CSSProperties}
    />
  );
}
