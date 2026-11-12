import { AlertTriangle, Loader2 } from 'lucide-react'
import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
}

/** A consistent, keyboard-accessible confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)

  const confirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isConfirming ? undefined : onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-rose-500/20 p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isConfirming}
            onClick={confirm}
            className="gap-2"
          >
            {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
