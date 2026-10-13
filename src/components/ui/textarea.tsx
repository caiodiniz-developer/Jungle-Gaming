import * as React from "react"
import { cn } from "@/lib/utils"

// componente área de texto
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[152px] w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
