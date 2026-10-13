import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  /** Elemento renderizado; padrão "div". */
  as?: "div" | "section" | "li" | "article" | "aside";
  /** Posição do item na fileira: cada um entra 70ms depois do anterior. */
  index?: number;
  className?: string;
  children: React.ReactNode;
} & Pick<React.HTMLAttributes<HTMLElement>, "aria-label" | "aria-labelledby" | "id">;

/**
 * Revela o conteúdo quando ele entra na tela (uma única vez). A animação é
 * só CSS (`.reveal` em styles.css); aqui fica apenas a detecção de visibilidade.
 */
export function Reveal({ as: Tag = "div", index = 0, className, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      // dispara um pouco antes de o bloco encostar na borda de baixo
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // o mesmo ref serve a qualquer uma das tags aceitas
      ref={ref as React.Ref<never>}
      data-revealed={revealed}
      style={index > 0 ? ({ "--reveal-delay": `${Math.min(index, 6) * 70}ms` } as React.CSSProperties) : undefined}
      className={cn("reveal", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
