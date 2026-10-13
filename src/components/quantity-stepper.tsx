import minusLargeIcon from "@/assets/icons/minus-lg.svg";
import minusIcon from "@/assets/icons/minus.svg";
import plusLargeIcon from "@/assets/icons/plus-lg.svg";
import plusIcon from "@/assets/icons/plus.svg";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** Nome do item, para os rótulos acessíveis dos botões. */
  itemName: string;
  size?: "sm" | "lg";
  disabled?: boolean;
  className?: string;
};

/**
 * Seletor de quantidade (botões-pílula do layout). Quantidades são sempre
 * inteiras e limitadas ao intervalo [min, max]; os botões desabilitam no limite.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  itemName,
  size = "sm",
  disabled = false,
  className,
}: QuantityStepperProps) {
  const large = size === "lg";
  const button = cn(
    "flex items-center justify-center rounded-full border border-ink bg-primary text-ink shadow-control transition-colors hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary",
    large ? "h-[49.5px] w-[33px]" : "h-[30px] w-5",
  );
  const iconSize = large ? "size-[26px]" : "size-4";

  return (
    <div
      role="group"
      aria-label={`Quantidade de ${itemName}`}
      className={cn("flex items-center gap-3", className)}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <Icon src={large ? minusLargeIcon : minusIcon} className={iconSize} />
      </button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-[2ch] text-center text-foreground tabular-nums",
          large ? "text-xl leading-7" : "text-[17px] leading-6",
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <Icon src={large ? plusLargeIcon : plusIcon} className={iconSize} />
      </button>
    </div>
  );
}
