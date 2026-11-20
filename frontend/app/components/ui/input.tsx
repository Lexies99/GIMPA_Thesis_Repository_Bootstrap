import * as React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, style, ...props }, ref) => {
    const hasPl = className.includes("pl-")
    const hasPr = className.includes("pr-")
    const hasP = className.includes("p-") && !hasPl && !hasPr

    const paddingClass = hasP
      ? ""
      : hasPl && hasPr
      ? "py-2.5"
      : hasPl
      ? "pr-3.5 py-2.5"
      : hasPr
      ? "pl-3.5 py-2.5"
      : "px-3.5 py-2.5"

    return (
      <input
        type={type}
        className={`flex h-11 w-full rounded-lg border text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${paddingClass} ${className}`}
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
  }
)
Input.displayName = "Input"

export { Input }
