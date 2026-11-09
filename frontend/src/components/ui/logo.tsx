import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  imageClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  subtitle?: string
}

export function Logo({
  className,
  imageClassName,
  size = 'md',
  showText = true,
  subtitle = 'MULTI-VENDOR',
}: LogoProps) {
  const sizeMap = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 sm:h-11 sm:w-11 rounded-xl',
    lg: 'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl',
    xl: 'h-16 w-16 rounded-2xl',
  }

  const textMap = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl md:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  }

  const dotMap = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
    xl: 'w-2.5 h-2.5',
  }

  // Format subtitle cleanly without hyphen breaks
  const cleanSubtitle = subtitle ? subtitle.replace(/[-_]/g, ' • ') : ''

  return (
    <div className={cn('flex items-center gap-2 sm:gap-2.5 group select-none shrink-0 min-w-0', className)}>
      {/* Brand Icon Medallion */}
      <div
        className={cn(
          'relative overflow-hidden shadow-md shadow-primary/20 ring-1 ring-primary/25 border border-primary/20 group-hover:scale-105 group-hover:shadow-primary/30 transition-all duration-300 bg-background shrink-0 flex items-center justify-center',
          sizeMap[size],
          imageClassName
        )}
      >
        <img
          src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
          alt="TYUSHOP Official"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget
            if (target.src.indexOf('logo.jpg') === -1) {
              target.src = '/logo.jpg'
            }
          }}
        />
      </div>

      {/* Brand Wordmark & Tagline Badge */}
      {showText && (
        <div className="flex flex-col justify-center shrink-0 whitespace-nowrap min-w-0 leading-none">
          {/* Main Logo Text */}
          <div className={cn('flex items-center tracking-tight font-black leading-none select-none', textMap[size])}>
            <span className="text-slate-900 dark:text-white drop-shadow-sm transition-colors">
              TYU
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-primary dark:from-blue-400 dark:via-indigo-400 dark:to-primary bg-clip-text text-transparent">
              SHOP
            </span>
            <span
              className={cn(
                'rounded-full bg-blue-600 dark:bg-blue-400 ml-0.5 self-start animate-pulse shadow-sm',
                dotMap[size]
              )}
            />
          </div>

          {/* Tagline Micro-Badge */}
          {cleanSubtitle && (
            <div className="flex items-center gap-1 mt-1 min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9.5px] font-extrabold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 leading-none whitespace-nowrap break-keep select-none shadow-xs">
                <span className="w-1 h-1 rounded-full bg-primary shrink-0 animate-ping" />
                {cleanSubtitle}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
