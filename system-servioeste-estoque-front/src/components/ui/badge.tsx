import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-transparent bg-muted text-muted-foreground",
      outline: "bg-background text-foreground",
      // Selos de situação: neutros, só o ponto tem cor (princípio XI).
      brand: "bg-background text-foreground before:size-1.5 before:rounded-full before:bg-brand before:content-['']",
      warning: "bg-background text-foreground before:size-1.5 before:rounded-full before:bg-warning before:content-['']",
      destructive: "bg-background text-foreground before:size-1.5 before:rounded-full before:bg-destructive before:content-['']",
    },
  },
  defaultVariants: { variant: "default" },
})

export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
