import * as React from "react"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={`peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-switch-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      {...props}
    />
  )
)
Switch.displayName = "Switch"

export { Switch }
