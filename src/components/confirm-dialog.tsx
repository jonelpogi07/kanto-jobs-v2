import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type ConfirmIntent = 'default' | 'destructive' | 'success'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep',
  intent = 'default',
  loading = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  intent?: ConfirmIntent
  loading?: boolean
  onConfirm: () => void | Promise<void>
}) {
  const Icon = intent === 'success' ? CheckCircle2 : AlertTriangle
  const iconTone =
    intent === 'destructive'
      ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/20'
      : intent === 'success'
        ? 'bg-success-soft text-success ring-1 ring-success/20'
        : 'bg-primary-soft text-primary ring-1 ring-primary/20'

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-sm" showCloseButton={false}>
        <div className="flex flex-col gap-4 p-5 pb-4">
          <div className={cn('flex size-12 items-center justify-center rounded-2xl', iconTone)}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <DialogHeader className="gap-1.5 pr-0 text-left">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        </div>
        <DialogFooter className="mt-0 flex-col-reverse gap-2 border-t bg-muted/30 p-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={intent === 'destructive' ? 'destructive' : 'default'}
            className={cn(
              'h-11 w-full font-bold sm:flex-1',
              intent === 'success' && 'bg-success text-success-foreground hover:bg-success/90',
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
