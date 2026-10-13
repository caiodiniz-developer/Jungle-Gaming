import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-bold whitespace-nowrap transition-[background-color,border-color,color,opacity,scale] duration-200 ease-kurio active:scale-[0.97] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-highlight",
        outline:
          "border border-primary bg-transparent font-medium text-highlight hover:bg-primary/10",
        secondary:
          "border border-border bg-surface-raised text-foreground hover:border-primary",
        ghost: "font-medium text-foreground hover:bg-surface-raised",
        link: "h-auto rounded-none p-0 font-normal text-highlight underline-offset-4 hover:underline",
        // botões-pílula das telas mobile do Figma
        pill: "rounded-full bg-linear-[104deg] from-primary from-4% to-primary/80 text-primary-foreground hover:from-highlight",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-[35px] px-3 text-sm",
        lg: "h-[45px] px-6 text-[15px]",
        xl: "h-[60px] px-8 text-base",
        icon: "size-10",
        "icon-sm": "size-[35px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
