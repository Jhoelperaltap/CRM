import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary ring-1 ring-primary/20 [a&]:hover:bg-primary/15",
        secondary:
          "bg-secondary text-secondary-foreground ring-1 ring-secondary-foreground/10 [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive/10 text-destructive ring-1 ring-destructive/20 [a&]:hover:bg-destructive/15",
        success:
          "bg-[oklch(0.62_0.19_155/0.1)] text-[oklch(0.52_0.19_155)] ring-1 ring-[oklch(0.62_0.19_155/0.2)] [a&]:hover:bg-[oklch(0.62_0.19_155/0.15)]",
        warning:
          "bg-[oklch(0.75_0.16_70/0.1)] text-[oklch(0.55_0.16_70)] ring-1 ring-[oklch(0.75_0.16_70/0.2)] [a&]:hover:bg-[oklch(0.75_0.16_70/0.15)]",
        info:
          "bg-[oklch(0.62_0.20_250/0.1)] text-[oklch(0.52_0.20_250)] ring-1 ring-[oklch(0.62_0.20_250/0.2)] [a&]:hover:bg-[oklch(0.62_0.20_250/0.15)]",
        outline:
          "border-2 border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
