import * as React from "react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children, className, ...props }: SelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      {...props}
    >
      {children}
    </select>
  )
}

const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

const SelectValue = ({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) => {
  if (children) return <>{children}</>
  return <option value="">{placeholder || "Select option"}</option>
}

const SelectContent = ({ children }: { children: React.ReactNode }) => (
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
