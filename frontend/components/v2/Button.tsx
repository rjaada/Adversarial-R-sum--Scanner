"use client"

import { forwardRef, ButtonHTMLAttributes } from "react"

type Variant = "default" | "outline"
type Size = "sm" | "default" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const sizes: Record<Size, string> = {
  sm:      "h-8 px-4 text-xs",
  default: "h-10 px-6 text-sm",
  lg:      "h-14 px-8 text-base",
}

const variants: Record<Variant, string> = {
  default: "bg-foreground text-primary-foreground hover:bg-foreground/90",
  outline: "border border-foreground/20 text-foreground hover:bg-foreground/5",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium transition-all duration-300 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = "Button"
