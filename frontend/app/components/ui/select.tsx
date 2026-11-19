import * as React from "react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children, className, style, ...props }: SelectProps & { style?: React.CSSProperties }) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`flex h-11 w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e2e5dc",
        color: "#1a1d1a",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}

const SelectTrigger = ({ children }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <>{children}</>
)

const SelectValue = ({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) => {
  if (children) return <>{children}</>
  return <option value="">{placeholder || "Select option"}</option>
}

const SelectContent = ({ children }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <>{children}</>
)

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement> & { value: string; children: React.ReactNode }
>(({ value, children, ...props }, ref) => (
  <option ref={ref} value={value} {...props}>
    {children}
  </option>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
