import * as React from "react"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => (
    <textarea
      className={`flex min-h-[96px] w-full rounded-lg border px-3.5 py-2.5 text-sm placeholder:text-[#9aa196] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e2e5dc",
        color: "#1a1d1a",
        ...style,
      }}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
