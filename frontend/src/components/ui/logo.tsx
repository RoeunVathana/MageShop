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
  subtitle = 'ENTERPRISE MARKETPLACE',
}: LogoProps) {
  const sizeMap = {
    sm: 'h-7 w-7',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const textMap = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  return (
    <div className={cn('flex items-center gap-2.5 group', className)}>
      <div
        className={cn(
          'relative rounded-xl overflow-hidden shadow-md shadow-primary/20 border border-primary/20 group-hover:scale-105 transition-transform bg-background shrink-0 flex items-center justify-center',
          sizeMap[size],
          imageClassName
        )}
      >
        <img
          src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
          alt="MegaCommerce Logo"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget
            if (target.src.indexOf('logo.jpg') === -1) {
              target.src = '/logo.jpg'
            }
          }}
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-black tracking-tight leading-none bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent',
              textMap[size]
            )}
          >
            MEGA<span className="text-primary">COMMERCE</span>
          </span>
          {subtitle && (
            <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

