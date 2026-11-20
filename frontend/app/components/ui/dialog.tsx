import * as React from "react"
import { X } from "lucide-react"

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
>(({ className, children, style, ...props }, ref) => {
  const { open, setOpen } = useDialogContext()

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "rgba(30, 36, 27, 0.62)", backdropFilter: "blur(2px)" }}
        onClick={() => setOpen(false)}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`fixed left-[50%] top-[50%] z-50 grid w-full ${
          (className || "").includes("max-w-") ? "" : "max-w-lg"
        } ${
          (className || "").includes("max-h-") ? "" : "max-h-[90vh]"
        } ${
          (className || "").includes("overflow-") ? "" : "overflow-y-auto"
        } translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 sm:p-7 shadow-2xl rounded-2xl ${className || ""}`}
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-color)",
          color: "var(--text-main)",
          ...style,
        }}
        {...props}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close modal"
          className="absolute top-5 right-5 size-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer"
          style={{
            backgroundColor: "var(--bg-subtle)",
            borderColor: "var(--border-color)",
            color: "var(--text-main)",
          }}
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </>
  )
})

DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1 text-left pr-10 ${className || ""}`} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-xl font-bold leading-8 tracking-tight m-0 ${className || ""}`}
    style={{ color: "var(--text-main)" }}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm m-0 ${className || ""}`}
    style={{ color: "var(--text-muted)" }}
    {...props}
  />
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
