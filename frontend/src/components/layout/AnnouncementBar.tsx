import { Sparkles, Phone, ChevronDown, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function AnnouncementBar() {
  const { currency, setCurrency, usdToKhrRate, allowedCurrencies, t } = useShopEngagement()
  const { toast } = useToast()
  const [currOpen, setCurrOpen] = useState(false)
  const [currMenuPosition, setCurrMenuPosition] = useState({ top: 0, left: 0, width: 208 })
  const currRef = useRef<HTMLDivElement>(null)
  const currMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currRef.current && !currRef.current.contains(e.target as Node)) {
        if (currMenuRef.current?.contains(e.target as Node)) return
        setCurrOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useLayoutEffect(() => {
    if (!currOpen) return

    const updateMenuPosition = () => {
      const rect = currRef.current?.getBoundingClientRect()
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
      const menuHeight = currMenuRef.current?.getBoundingClientRect().height ?? 0
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

      setCurrMenuPosition({
        top: Math.round(top),
        left: Math.round(left),
        width: Math.round(menuWidth),
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
  }, [currOpen])

  const handleSelectCurrency = (nextCurr: 'USD' | 'KHR') => {
    setCurrency(nextCurr)
    setCurrOpen(false)
    toast({
      title:
        nextCurr === 'KHR'
          ? t('Currency: Khmer Riel KHR (៛)', 'រូបិយប័ណ្ណ៖ ប្រាក់រៀល KHR (៛)')
          : t('Currency: US Dollar ($)', 'រូបិយប័ណ្ណ៖ ដុល្លារអាមេរិក ($)'),
      description:
        nextCurr === 'KHR'
          ? t(
              `Product prices are now displayed in Khmer Riel (1 USD = ${usdToKhrRate.toLocaleString()} ៛).`,
              `តម្លៃទំនិញត្រូវបានបង្ហាញជាប្រាក់រៀល (១ ដុល្លារ = ${usdToKhrRate.toLocaleString()} ៛)។`
            )
          : t('Product prices are now displayed in USD ($).', 'តម្លៃទំនិញត្រូវបានបង្ហាញជាប្រាក់ដុល្លារ ($)។'),
      type: 'info',
    })
  }

  return (
    <div className="relative z-[160] isolate border-b border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 sm:px-4 sm:py-2">
      <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4 flex-nowrap overflow-visible">
        {/* Left message */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 shadow-xs">
            <Sparkles className="w-3 h-3 shrink-0" /> <span className="whitespace-nowrap break-keep">{t('DEAL', 'ពិសេស')}</span>
          </span>
          <span className="truncate text-[11px] sm:text-xs text-slate-300 font-medium">
            {t('Free Express Delivery & Rewards', 'ដឹកជញ្ជូនរហ័ស & ពិន្ទុរង្វាន់')}
          </span>
        </div>

        {/* Right utilities: Help, Language, Currency */}
        <div className="flex items-center gap-2 sm:gap-3 text-slate-300 shrink-0 whitespace-nowrap">
          <a
            href="tel:016555637"
            className="hidden xl:flex items-center gap-1 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap text-[11px]"
          >
            <Phone className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap break-keep">{t('Support: 016 555 637', 'ជំនួយ: 016 555 637')}</span>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
            {/* Language Selector Matching User Reference Design */}
            <LanguageSwitcher variant="dark-pill" />

            <span className="text-slate-600 select-none">|</span>

            {/* Currency Selector */}
            <div
              ref={currRef}
              className={currOpen ? 'relative z-[3000] shrink-0' : 'relative shrink-0'}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrOpen((prev) => !prev)
                }}
                aria-expanded={currOpen}
                aria-haspopup="menu"
                aria-label="Select Currency"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap text-xs font-bold"
              >
                <span className="font-bold text-xs whitespace-nowrap break-keep">
                  <span className="sm:hidden">{currency}</span>
                  <span className="hidden sm:inline">{currency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0 ${currOpen ? 'rotate-180' : ''}`} />
              </button>

              {currOpen && typeof document !== 'undefined' && createPortal(
                <div
                  ref={currMenuRef}
                  role="menu"
                  className="pointer-events-auto fixed z-[2147483647] animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{
                    top: currMenuPosition.top,
                    left: currMenuPosition.left,
                    width: currMenuPosition.width,
                  }}
                >
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 py-1.5 text-xs text-slate-200 shadow-2xl shadow-slate-950/30">
                    {(allowedCurrencies === 'BOTH' || allowedCurrencies === 'USD_ONLY') && (
                      <button
                        type="button"
                        onClick={() => handleSelectCurrency('USD')}
                        role="menuitem"
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-slate-700 cursor-pointer ${
                          currency === 'USD' ? 'text-white font-bold bg-slate-700/60' : 'text-slate-300'
                        }`}
                      >
                        <span>USD ($)</span>
                        {currency === 'USD' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    )}

                    {(allowedCurrencies === 'BOTH' || allowedCurrencies === 'KHR_ONLY') && (
                      <button
                        type="button"
                        onClick={() => handleSelectCurrency('KHR')}
                        role="menuitem"
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-slate-700 cursor-pointer ${
                          currency === 'KHR' ? 'text-white font-bold bg-slate-700/60' : 'text-slate-300'
                        }`}
                      >
                        <span>KHR (៛)</span>
                        {currency === 'KHR' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    )}

                    <div className="px-3 py-1 border-t border-slate-700/80 bg-slate-850 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Rate:</span>
                      <span className="font-mono text-indigo-300 font-semibold">1$ = {usdToKhrRate.toLocaleString()}៛</span>
                    </div>

                    <Link
                      to="/admin/currency"
                      className="block text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline px-3 py-1 bg-slate-900 border-t border-slate-700/80"
                    >
                      ⚙ {t('Custom Rate (Admin)', 'កំណត់អត្រា (Admin)')}
                    </Link>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

