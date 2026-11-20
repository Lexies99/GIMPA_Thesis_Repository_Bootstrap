import * as React from "react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children, className, style, ...props }: SelectProps & { style?: React.CSSProperties }) => {
  let triggerClassName = ""
  let triggerStyle: React.CSSProperties | undefined

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && (child.type as any)?.displayName === "SelectTrigger") {
      const childProps = child.props as { className?: string; style?: React.CSSProperties }
      if (childProps.className) triggerClassName = childProps.className
      if (childProps.style) triggerStyle = childProps.style
    }
  })

  const mergedClass = `${className || ""} ${triggerClassName}`.trim()
  const hasWidth = /\bw-|\bmin-w-|\bmax-w-/.test(mergedClass)
  const hasHeight = /\bh-/.test(mergedClass)
  const hasRounded = /\brounded/.test(mergedClass)

  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`flex ${hasHeight ? "" : "h-11"} ${hasWidth ? "" : "w-full"} ${hasRounded ? "" : "rounded-lg"} border px-3.5 py-1.5 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${mergedClass}`}
      style={{
        backgroundColor: "var(--bg-input)",
        borderColor: "var(--border-color)",
        color: "var(--text-main)",
        ...triggerStyle,
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
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) => {
  if (children) return <>{children}</>
  if (!placeholder) return null
  return <option value="">{placeholder}</option>
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
