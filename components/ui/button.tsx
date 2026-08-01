import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// documents/DESIGN.md — two button grammars only: the Action Blue pill
// (`button-primary`) and the compact utility rect at rounded.sm
// (`button-dark-utility`). Weight stays 400: the ladder has no 500.
// Press state is the system-wide `transform: scale(0.95)`.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-normal tracking-[-0.224px] transition-colors active:scale-95 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // button-primary — Action Blue pill
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        // button-secondary-pill — the "ghost pill"
        outline: "border border-primary bg-transparent text-primary",
        // button-pearl-capsule
        secondary: "rounded-[11px] bg-secondary text-secondary-foreground",
        // button-dark-utility
        ghost: "rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        // text-link
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-[22px] py-[11px]",
        sm: "h-9 px-4",
        lg: "h-12 px-7 text-[18px] font-light",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
