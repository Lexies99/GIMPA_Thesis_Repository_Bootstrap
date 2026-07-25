import * as React from "react"

interface CollapsibleContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextType | undefined>(undefined)

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Collapsible = ({ open: controlledOpen, onOpenChange, children }: CollapsibleProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

  const setOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(open)
    }
    onOpenChange?.(open)
  }

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

const useCollapsibleContext = () => {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within a Collapsible")
  }
  return context
}

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen, open } = useCollapsibleContext()

  return (
    <button
      ref={ref}
      onClick={(e) => {
        setOpen(!open)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const { open } = useCollapsibleContext()

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:collapse data-[state=open]:expand ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
