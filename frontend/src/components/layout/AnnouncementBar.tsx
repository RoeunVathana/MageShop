import { Sparkles, Phone, Globe, ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'

export function AnnouncementBar() {
  const { language, setLanguage, currency, setCurrency, t } = useShopEngagement()
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
      title: nextCurr === 'KHR' ? 'រូបិយប័ណ្ណ៖ ប្រាក់រៀល KHR (៛)' : 'Currency: US Dollar ($)',
      description:
        nextCurr === 'KHR'
          ? 'តម្លៃទំនិញត្រូវបានបង្ហាញជាប្រាក់រៀល (១ ដុល្លារ ≈ ៤,១០០ ៛)។'
          : 'Product prices are now displayed in USD ($).',
      type: 'info',
    })
  }

  return (
    <div className="relative z-50 bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left message */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-1 bg-primary-600 text-white px-2 py-0.5 rounded-full font-medium text-[10px]">
            <Sparkles className="w-3 h-3" /> {t('Mega Sale', 'ប្រូម៉ូសិនពិសេស')}
          </span>
          <span>
            {t(
              'TyuShop Multi-Vendor E-Commerce Platform • Fast Delivery & 100-Pt Free Rewards',
              'TyuShop ផ្សារទំនើបអនឡាញ • ដឹកជញ្ជូនរហ័ស និងសន្សំ ១០០ ពិន្ទុប្តូរទំនិញឥតគិតថ្លៃ'
            )}
          </span>
        </div>

        {/* Right utilities: Help, Language, Currency */}
        <div className="flex items-center gap-4 text-slate-300">
          <a
            href="tel:+18005556342"
            className="hidden md:flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            <Phone className="w-3 h-3" />
            <span>{t('Support: +1 (800) 555-MEGA', 'ជំនួយអតិថិជន: +1 (800) 555-MEGA')}</span>
          </a>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div
              ref={langRef}
              className="relative"
              onMouseEnter={() => setLangOpen(true)}
              onMouseLeave={() => setLangOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setLangOpen((prev) => !prev)
                  setCurrOpen(false)
                }}
                aria-expanded={langOpen}
                aria-label="Select Language"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-primary-400" />
                <span className="font-semibold">{language === 'KM' ? 'ខ្មែរ (KM)' : 'EN'}</span>
                <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full pt-1 z-50 min-w-36">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 text-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleSelectLanguage('EN')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors cursor-pointer ${
                        language === 'EN' ? 'text-white font-bold bg-slate-700/60' : 'text-slate-300'
                      }`}
                    >
                      <span>English (EN)</span>
                      {language === 'EN' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectLanguage('KM')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors cursor-pointer ${
                        language === 'KM' ? 'text-white font-bold bg-slate-700/60' : 'text-slate-300'
                      }`}
                    >
                      <span>Khmer (ខ្មែរ)</span>
                      {language === 'KM' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-slate-600">|</span>

            {/* Currency Selector */}
            <div
              ref={currRef}
              className="relative"
              onMouseEnter={() => setCurrOpen(true)}
              onMouseLeave={() => setCurrOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrOpen((prev) => !prev)
                  setLangOpen(false)
                }}
                aria-expanded={currOpen}
                aria-label="Select Currency"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-semibold">{currency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}</span>
                <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${currOpen ? 'rotate-180' : ''}`} />
              </button>

              {currOpen && (
                <div className="absolute right-0 top-full pt-1 z-50 min-w-28">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 text-slate-200 overflow-hidden">
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

