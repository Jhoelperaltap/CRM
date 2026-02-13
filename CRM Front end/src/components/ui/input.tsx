import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground",
        "h-10 w-full min-w-0 rounded-lg border-2 border-input bg-background/50 px-3 py-2",
        "text-sm transition-all duration-200 outline-none",
        "hover:border-input/80 hover:bg-background",
        "focus-visible:border-primary focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10",
        "dark:bg-input/20 dark:hover:bg-input/30 dark:focus-visible:bg-input/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
