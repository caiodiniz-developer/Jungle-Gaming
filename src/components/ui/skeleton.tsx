import { cn } from "@/lib/utils"

/**
 * Placeholder com efeito shimmer. O `prefers-reduced-motion` global
 * (styles.css) interrompe a animação e deixa só o bloco estático.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-surface-raised bg-linear-to-r from-surface-raised via-border-soft to-surface-raised bg-size-[200%_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
