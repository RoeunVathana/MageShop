import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  titleKm?: string
  description?: string
  descriptionKm?: string
  type?: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void
  toasts: Toast[]
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { language } = useShopEngagement()

  // Do not leave an already-open notification in the previous language. New
  // notifications are created after the language switch and use the current
  // locale from their caller.
  useEffect(() => {
    setToasts([])
  }, [language])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, titleKm, description, descriptionKm, type = 'info', duration = 4000 }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: Toast = { id, title, titleKm, description, descriptionKm, type, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div
        className="fixed bottom-4 left-1/2 z-[2147483500] flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 flex-col gap-3 px-0 pointer-events-none sm:bottom-6 sm:left-auto sm:right-6 sm:w-full sm:translate-x-0"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 pl-5 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in-0 slide-in-from-right-5 hover:-translate-y-0.5',
              t.type === 'success' && 'border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-emerald-950/10 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-50',
              t.type === 'error' && 'border-rose-200 bg-rose-50/95 text-rose-950 shadow-rose-950/10 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-50',
              t.type === 'warning' && 'border-amber-200 bg-amber-50/95 text-amber-950 shadow-amber-950/10 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-50',
              t.type === 'info' && 'border-slate-200 bg-white/95 text-slate-950 shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-50'
            )}
          >
            <span
              className={cn(
                'absolute inset-y-0 left-0 w-1',
                t.type === 'success' && 'bg-emerald-500',
                t.type === 'error' && 'bg-rose-500',
                t.type === 'warning' && 'bg-amber-500',
                t.type === 'info' && 'bg-indigo-500'
              )}
            />

            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                t.type === 'success' && 'bg-emerald-500/15',
                t.type === 'error' && 'bg-rose-500/15',
                t.type === 'warning' && 'bg-amber-500/15',
                t.type === 'info' && 'bg-indigo-500/15'
              )}
            >
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
              {t.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-5">{language === 'KM' && t.titleKm ? t.titleKm : t.title}</p>
              {(language === 'KM' && t.descriptionKm ? t.descriptionKm : t.description) && (
                <p className="mt-1 text-xs leading-5 text-current/75">
                  {language === 'KM' && t.descriptionKm ? t.descriptionKm : t.description}
                </p>
              )}
            </div>

            <button
              onClick={() => dismiss(t.id)}
              type="button"
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg p-1 text-current/55 transition-colors hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

