import * as React from "react"

interface DialogContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined)

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open: controlledOpen, onOpenChange, children }: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

  const setOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(open)
    }
    onOpenChange?.(open)
  }

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

const useDialogContext = () => {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog")
  }
  return context
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useDialogContext()

  return (
    <button
      ref={ref}
      onClick={(e) => {
        setOpen(true)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useDialogContext()

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 backdrop-blur-sm"
        style={{backgroundColor:'rgba(0,0,0,0.5)'}}
        onClick={() => setOpen(false)}
      />
      <div
        ref={ref}
        className={`fixed left-[50%] top-[50%] z-50 grid w-full ${
          (className || '').includes('max-w-') ? '' : 'max-w-lg'
        } translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg sm:rounded-lg ${className || ""}`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)',
        }}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ""}`} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={`text-lg font-semibold leading-none tracking-tight ${className || ""}`} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={`text-sm text-muted-foreground ${className || ""}`} {...props} />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
}
