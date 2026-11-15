import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DashboardModalProps {
  children: React.ReactNode
  onClose: () => void
  className?: string
}

/**
 * Shared shell for dashboard-only modals.
 *
 * Dashboard pages contain larger forms than the storefront, so keeping the
 * shell here prevents each page from drifting in sizing and dismissal
 * behavior. Escape, backdrop click, and the page's own close button all use
 * the same onClose callback.
 */
export function DashboardModal({ children, onClose, className }: DashboardModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const closeFromBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div
      className={cn(
        'dashboard-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4',
        className
      )}
      onMouseDown={closeFromBackdrop}
      data-dashboard-modal="true"
    >
      <div
        className="dashboard-modal-host flex min-h-0 w-full items-center justify-center"
        onMouseDown={closeFromBackdrop}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
