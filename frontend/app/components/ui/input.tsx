import * as React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2 ${className || ""}`}
      style={{
        backgroundColor: "var(--bg-input)",
        borderColor: "var(--border-color)",
        color: "var(--text-main)",
        ...style,
      }}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
