import * as React from "react"

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, style, ...props }, ref) => (
    <label
      ref={ref}
      className={`text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
      style={{ color: "var(--text-sub)", ...style }}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
