import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive"
  size?: "default" | "sm" | "lg"
}

const getVariantStyle = (variant: ButtonProps["variant"]): React.CSSProperties => {
  switch (variant) {
    case "outline":
      return {
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        color: "var(--text-sub)",
      }
    case "ghost":
      return {
        backgroundColor: "transparent",
        color: "var(--text-muted)",
      }
    case "secondary":
      return {
        backgroundColor: "var(--bg-input)",
        color: "var(--text-sub)",
        border: "1px solid var(--border-color)",
      }
    case "destructive":
      return {
        backgroundColor: "#ef4444",
        color: "#ffffff",
      }
    default: // "default" — primary purple
      return {}
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", style, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variantClass = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "",
      ghost: "",
      secondary: "",
      destructive: "",
    }[variant]

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8"
    }

    const variantStyle = variant !== "default" ? getVariantStyle(variant) : {}

    return (
      <button
        className={`${baseStyles} ${variantClass} ${sizes[size]} ${className || ""}`}
        style={{ ...variantStyle, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
