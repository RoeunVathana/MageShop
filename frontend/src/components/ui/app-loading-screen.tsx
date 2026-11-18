import { Logo } from '@/components/ui/logo'

interface AppLoadingScreenProps {
  label?: string
}

/**
 * Full-viewport loading state used while a route-level page is downloaded.
 * Keeping it centered prevents the old partial-height loader from appearing
 * too high or leaving the page looking empty on phones and tablets.
 */
export function AppLoadingScreen({ label = 'Loading TYUSHOP' }: AppLoadingScreenProps) {
  return (
    <main
      className="relative isolate grid min-h-[100dvh] place-items-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/80 px-6 py-12 text-center dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/10" />

      <section className="relative flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-white/80 bg-white/70 px-8 py-9 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20 sm:px-12 sm:py-11">
        <div className="relative mb-7 h-24 w-24 sm:h-28 sm:w-28">
          <span className="absolute inset-0 rounded-[2rem] border-4 border-indigo-200/70 dark:border-indigo-900/80" />
          <span
            className="absolute inset-0 rounded-[2rem] border-4 border-transparent border-r-violet-500 border-t-blue-600 animate-spin"
            style={{ animationDuration: '1.1s' }}
          />
          <div className="absolute inset-3 grid place-items-center rounded-[1.4rem] bg-white shadow-lg shadow-indigo-500/15 dark:bg-slate-900">
            <Logo size="md" showText={false} className="scale-110" />
          </div>
        </div>

        <Logo size="md" subtitle="MULTI • VENDOR" />
        <p className="mt-5 text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
          {label}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Preparing your experience…
        </p>

        <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500" />
        </div>
      </section>
    </main>
  )
}
