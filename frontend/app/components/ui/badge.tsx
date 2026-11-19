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
            backgroundColor: "#eef3e8",
            borderColor: "transparent",
            color: "#263021",
          }
        case "secondary":
          return {
            backgroundColor: "#5a6552",
            borderColor: "transparent",
            color: "#ffffff",
          }
        case "destructive":
          return {
            backgroundColor: "#f9e2de",
            borderColor: "transparent",
            color: "#a82819",
          }
        default:
          return {
            backgroundColor: "#dce7d0",
            borderColor: "transparent",
            color: "#1a1d1a",
          }
      }
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${className || ""}`}
        style={{ ...getStyle(), ...style }}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
