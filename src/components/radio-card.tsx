import { cn } from "@/lib/utils";

type RadioCardProps = React.ComponentProps<"input"> & {
  checked: boolean;
  /** Lado em que o círculo do rádio aparece. */
  indicator?: "start" | "end";
};

/**
 * Opção em forma de cartão. O `<input type="radio">` nativo cobre o cartão
 * inteiro (invisível): clique, foco, teclado e leitores de tela agem nele.
 * O estado marcado aparece na borda e no círculo preenchido, não só na cor.
 */
export function RadioCard({ checked, indicator = "start", className, children, ...inputProps }: RadioCardProps) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 border px-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
        checked ? "border-primary" : "border-border hover:border-border-soft",
        className,
      )}
    >
      <input
        type="radio"
        checked={checked}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        {...inputProps}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary" : "border-subtle",
          indicator === "end" && "order-last ml-auto",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      {children}
    </label>
  );
}
