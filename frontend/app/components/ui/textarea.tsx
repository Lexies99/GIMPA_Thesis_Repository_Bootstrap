import * as React from "react"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => (
    <textarea
      className={`flex min-h-[96px] w-full rounded-lg border px-3.5 py-2.5 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
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
Textarea.displayName = "Textarea"

export { Textarea }
