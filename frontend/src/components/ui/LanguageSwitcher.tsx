import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
  variant?: 'pill' | 'dark-pill' | 'compact'
  showDropdown?: boolean
}

export function LanguageSwitcher({
  className,
  variant = 'pill',
  showDropdown = true,
}: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useShopEngagement()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useLayoutEffect(() => {
    if (!open || !showDropdown) return

    const updateMenuPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportGutter = 8
      const menuGap = 8
      const menuWidth = Math.min(208, window.innerWidth - viewportGutter * 2)
      const maxLeft = Math.max(viewportGutter, window.innerWidth - menuWidth - viewportGutter)
      const left = Math.min(
        Math.max(viewportGutter, rect.right - menuWidth),
        maxLeft
      )
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 0
      const preferredTop = rect.bottom + menuGap
      const fitsBelow = preferredTop + menuHeight <= viewportHeight - viewportGutter
      const top = fitsBelow
        ? preferredTop
        : Math.max(
            viewportGutter,
            Math.min(
              rect.top - menuHeight - menuGap,
              viewportHeight - menuHeight - viewportGutter
            )
          )

      setMenuPosition({
        top: Math.round(top),
        left: Math.round(left),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    window.visualViewport?.addEventListener('resize', updateMenuPosition)
    window.visualViewport?.addEventListener('scroll', updateMenuPosition)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.visualViewport?.removeEventListener('resize', updateMenuPosition)
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition)
    }
  }, [open, showDropdown])

  const handleSelect = (nextLang: 'EN' | 'KM') => {
    setLanguage(nextLang)
    setOpen(false)
    toast({
      title: nextLang === 'KM' ? 'បានប្តូរទៅភាសាខ្មែរ 🇰🇭' : 'Switched to English 🇺🇸',
      description:
        nextLang === 'KM'
          ? 'គេហទំព័រត្រូវបានប្តូរទៅជាភាសាខ្មែរដោយជោគជ័យ។'
          : 'Website language successfully updated to English.',
      type: 'info',
    })
  }

  const toggleLang = () => {
    if (!showDropdown) {
      handleSelect(language === 'KM' ? 'EN' : 'KM')
    } else {
      setOpen((prev) => !prev)
    }
  }

  const isDarkPill = variant === 'dark-pill'

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center shrink-0',
        open && 'z-[3000]',
        className
      )}
    >
      {/* Pill Button matching the user's reference design */}
      <button
        type="button"
        onClick={toggleLang}
        aria-expanded={open}
        aria-haspopup={showDropdown ? 'menu' : undefined}
        aria-label={t('Select Language', 'ជ្រើសរើសភាសា')}
        className={cn(
          'language-switcher-trigger flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-xl transition-all cursor-pointer select-none text-xs font-bold tracking-tight',
          isDarkPill
            ? 'bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 shadow-xs'
        )}
      >
        {/* Country Flag Icon */}
        <div className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-xs border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center bg-slate-200">
          {language === 'KM' ? (
            <img
              src="/flags/kh.svg"
              alt="Cambodia Flag"
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <img
              src="/flags/us.svg"
              alt="United States Flag"
              className="w-full h-full object-cover"
              loading="eager"
            />
          )}
        </div>

        {/* Label: ខ្មែរ / English */}
        <span className="font-bold text-xs whitespace-nowrap break-keep">
          {language === 'KM' ? (
            'ខ្មែរ'
          ) : (
            <>
              <span className="sm:hidden">EN</span>
              <span className="hidden sm:inline">English</span>
            </>
          )}
        </span>

        {/* Down Chevron */}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="language-switcher-menu pointer-events-auto fixed z-[2147483647] animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: Math.min(208, typeof window !== 'undefined' ? window.innerWidth - 16 : 208),
          }}
        >
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 text-slate-800 dark:text-slate-100 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => handleSelect('KM')}
              role="menuitem"
              className={cn(
                'language-switcher-option w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer text-left',
                language === 'KM'
                  ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-xs border border-black/10 shrink-0">
                  <img src="/flags/kh.svg" alt="Cambodia" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold">ភាសាខ្មែរ (Khmer)</span>
              </div>
              {language === 'KM' && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelect('EN')}
              role="menuitem"
              className={cn(
                'language-switcher-option w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer text-left',
                language === 'EN'
                  ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-xs border border-black/10 shrink-0">
                  <img src="/flags/us.svg" alt="English" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold">English (EN)</span>
              </div>
              {language === 'EN' && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

