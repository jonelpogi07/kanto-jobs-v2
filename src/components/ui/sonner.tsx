
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      closeButton
      gap={10}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 3800,
        classNames: {
          toast:
            "cn-toast group/toast pointer-events-auto rounded-2xl border border-border/80 bg-popover/95 px-4 py-3 text-popover-foreground shadow-xl shadow-slate-950/10 backdrop-blur supports-backdrop-filter:bg-popover/90",
          title: "text-sm font-bold tracking-tight",
          description: "mt-0.5 text-xs leading-relaxed text-muted-foreground",
          icon: "mt-0.5",
          closeButton: "size-7 rounded-full border border-border/80 bg-background/80 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground",
          actionButton: "h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground",
          cancelButton: "h-8 rounded-lg bg-muted px-3 text-xs font-semibold text-foreground",
          success: "!border-primary/30 !bg-primary-soft/40 !text-foreground [&>svg]:text-primary [&_[data-close-button]]:text-foreground [&_[data-close-button]]:border-border [&_[data-close-button]]:bg-background",
          error: "!border-red-200/80",
          warning: "!border-amber-200/80",
          info: "!border-sky-200/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
