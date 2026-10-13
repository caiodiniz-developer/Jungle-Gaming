import { useState } from "react";
import { cn } from "@/lib/utils";

type FlashOnChangeProps = {
  /** Valor observado; o brilho acontece quando ele muda depois da primeira exibição. */
  value: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Destaca por um instante um valor que acabou de mudar (preço em tempo real,
 * total recalculado). Na primeira exibição não há animação: só mudanças brilham.
 */
export function FlashOnChange({ value, className, children }: FlashOnChangeProps) {
  const [initial] = useState(value);
  return (
    // a chave reinicia a animação a cada novo valor
    <span key={value} className={cn("rounded-sm", value !== initial && "animate-flash", className)}>
      {children}
    </span>
  );
}
