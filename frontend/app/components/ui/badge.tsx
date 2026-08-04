import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", style, ...props }, ref) => {
    const getStyle = (): React.CSSProperties => {
      switch (variant) {
        case "outline":
          return {
            backgroundColor: "var(--bg-input)",
            borderColor: "var(--border-color)",
            color: "var(--text-sub)",
          }
        case "secondary":
          return {
            backgroundColor: "var(--bg-subtle)",
            borderColor: "var(--border-color)",
            color: "var(--text-muted)",
          }
        case "destructive":
          return {
            backgroundColor: "#ef4444",
            borderColor: "transparent",
            color: "#ffffff",
          }
        default:
          return {
            backgroundColor: "#8b5cf6",
            borderColor: "transparent",
            color: "#ffffff",
          }
      }
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className || ""}`}
        style={{ ...getStyle(), ...style }}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
