import { useState } from 'react'
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
  subtitle = 'MULTI • VENDOR',
}: LogoProps) {
  const [logoSrc, setLogoSrc] = useState('/logo.jpg')
  const [logoFailed, setLogoFailed] = useState(false)
  const sizeMap = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-9 w-9 sm:h-11 sm:w-11 rounded-xl',
    lg: 'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl',
    xl: 'h-16 w-16 rounded-2xl',
  }

  const textMap = {
    sm: 'text-base sm:text-lg',
    md: 'text-base sm:text-xl md:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  }

  // Format subtitle cleanly without hyphen breaks
  const cleanSubtitle = subtitle ? subtitle.replace(/[-_]/g, ' • ') : ''

  return (
    <div className={cn('flex items-center gap-2 sm:gap-2.5 group select-none shrink-0 min-w-0', className)}>
      {/* Brand Icon Medallion */}
      <div
        className={cn(
          'relative overflow-hidden shadow-xs ring-1 ring-primary/25 border border-primary/20 group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-primary/40 group-hover:shadow-md group-hover:shadow-primary/25 transition-all duration-300 bg-background shrink-0 flex items-center justify-center',
          sizeMap[size],
          imageClassName
        )}
      >
        {logoFailed ? (
          <span className="text-[10px] font-black tracking-tight text-primary" aria-hidden="true">
            TYU
          </span>
        ) : (
          <img
            src={logoSrc}
            alt="TYUSHOP Official"
            width="64"
            height="64"
            decoding="async"
            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => {
              if (logoSrc !== '/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg') {
                setLogoSrc('/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg')
              } else {
                setLogoFailed(true)
              }
            }}
          />
        )}
      </div>

      {/* Brand Wordmark & Tagline */}
      {showText && (
        <div className="flex flex-col justify-center shrink-0 whitespace-nowrap min-w-0 leading-none">
          {/* Main Logo Text with smooth hover sweep */}
          <div className={cn('flex items-baseline tracking-tight font-black leading-none select-none transition-transform duration-200 group-hover:scale-[1.02]', textMap[size])}>
            <span className="text-slate-950 dark:text-white drop-shadow-xs transition-colors">
              TYU
            </span>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent group-hover:brightness-115 transition-all duration-300">
              SHOP
            </span>
          </div>

          {/* Clean Tagline */}
          {cleanSubtitle && (
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 min-w-0">
              <span className="text-[7.5px] sm:text-[9.5px] font-black tracking-widest uppercase text-muted-foreground/80 group-hover:text-primary/90 transition-colors duration-200 leading-none whitespace-nowrap break-keep select-none">
                {cleanSubtitle}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
