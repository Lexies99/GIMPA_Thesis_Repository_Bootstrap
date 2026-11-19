import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "olive"
  size?: "default" | "sm" | "lg"
}

const getVariantStyle = (variant: ButtonProps["variant"]): React.CSSProperties => {
  switch (variant) {
    case "outline":
      return {
        backgroundColor: "#ffffff",
        border: "1px solid #dcdfd6",
        color: "#1a1d1a",
      }
    case "ghost":
      return {
        backgroundColor: "transparent",
        color: "#3c443a",
      }
    case "secondary":
      return {
        backgroundColor: "#f4f6f0",
        color: "#1a1d1a",
        border: "1px solid #eaece4",
      }
    case "olive":
      return {
        backgroundColor: "#5a6552",
        color: "#ffffff",
        border: "1px solid #5a6552",
      }
    case "destructive":
      return {
        backgroundColor: "#c93b2b",
        color: "#ffffff",
        border: "1px solid #c93b2b",
      }
    default: // "default" — FinPlanner Soft Sage button (#dce7d0 with dark text)
      return {
        backgroundColor: "#dce7d0",
        color: "#1a1d1a",
        border: "1px solid #cfe0bf",
      }
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", style, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

    const sizes = {
      default: "h-10 px-5 py-2",
      sm: "h-9 rounded-lg px-3.5 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
    }

    const variantStyle = getVariantStyle(variant)

    return (
      <button
        className={`${baseStyles} ${sizes[size]} ${className || ""}`}
        style={{ ...variantStyle, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
