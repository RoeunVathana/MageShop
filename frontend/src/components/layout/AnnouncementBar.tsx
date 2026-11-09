import { Sparkles, Phone, ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function AnnouncementBar() {
  const { language, setLanguage, currency, setCurrency, usdToKhrRate, allowedCurrencies, t } = useShopEngagement()
  const { toast } = useToast()
  const [langOpen, setLangOpen] = useState(false)
  const [currOpen, setCurrOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const currRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
      if (currRef.current && !currRef.current.contains(e.target as Node)) {
        setCurrOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectLanguage = (nextLang: 'EN' | 'KM') => {
    setLanguage(nextLang)
    setLangOpen(false)
    toast({
      title: nextLang === 'KM' ? 'បានប្តូរទៅភាសាខ្មែរ (Khmer) 🇰🇭' : 'Switched to English (EN) 🇺🇸',
      description:
        nextLang === 'KM'
          ? 'គេហទំព័រត្រូវបានប្តូរទៅជាភាសាខ្មែរដោយជោគជ័យ។'
          : 'Storefront language updated to English.',
      type: 'info',
    })
  }

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
    <div className="relative z-50 bg-slate-900 text-slate-200 text-xs py-1.5 sm:py-2 px-2.5 sm:px-4 border-b border-slate-800">
      <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4 flex-nowrap overflow-hidden">
        {/* Left message */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 truncate">
          <span className="inline-flex items-center gap-1 bg-primary-600 text-white px-2 py-0.5 rounded-full font-medium text-[10px] shrink-0">
            <Sparkles className="w-3 h-3 shrink-0" /> <span className="whitespace-nowrap break-keep">{t('TYUSHOP', 'ពិសេស')}</span>
          </span>
          <span className="truncate text-[11px] sm:text-xs">
            {t(
              'Fast Delivery • 100-Pt Free Rewards',
              'ដឹកជញ្ជូនរហ័ស • សន្សំ ១០០ ពិន្ទុប្តូររង្វាន់'
            )}
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
              className="relative shrink-0"
              onMouseEnter={() => setCurrOpen(true)}
              onMouseLeave={() => setCurrOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrOpen((prev) => !prev)
                }}
                aria-expanded={currOpen}
                aria-label="Select Currency"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap text-xs font-bold"
              >
                <span className="font-bold text-xs whitespace-nowrap break-keep">
                  {currency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0 ${currOpen ? 'rotate-180' : ''}`} />
              </button>

              {currOpen && (
                <div className="absolute right-0 top-full pt-1 z-50 min-w-36">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 text-slate-200 overflow-hidden text-xs">
                    {(allowedCurrencies === 'BOTH' || allowedCurrencies === 'USD_ONLY') && (
                      <button
                        type="button"
                        onClick={() => handleSelectCurrency('USD')}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors cursor-pointer ${
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
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors cursor-pointer ${
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

