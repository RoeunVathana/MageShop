import { Sparkles, Phone, Globe, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function AnnouncementBar() {
  const [lang, setLang] = useState('EN')
  const [currency, setCurrency] = useState('USD')

  return (
    <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left message */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-1 bg-primary-600 text-white px-2 py-0.5 rounded-full font-medium text-[10px]">
            <Sparkles className="w-3 h-3" /> Mega Sale
          </span>
          <span>Phase 1 Project Foundation Active • Multi-Vendor E-Commerce Platform</span>
        </div>

        {/* Right utilities: Help, Language, Currency */}
        <div className="flex items-center gap-4 text-slate-300">
          <div className="hidden md:flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
            <Phone className="w-3 h-3" />
            <span>Support: +1 (800) 555-MEGA</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative group cursor-pointer">
              <span className="flex items-center gap-1 hover:text-white">
                <Globe className="w-3 h-3" />
                <span>{lang}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </span>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded shadow-lg py-1 z-50 text-slate-200 min-w-24">
                <button
                  type="button"
                  onClick={() => setLang('EN')}
                  className="w-full text-left px-3 py-1 text-xs hover:bg-slate-700 block"
                >
                  English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setLang('KM')}
                  className="w-full text-left px-3 py-1 text-xs hover:bg-slate-700 block"
                >
                  Khmer (ខ្មែរ)
                </button>
              </div>
            </div>

            <span className="text-slate-600">|</span>

            {/* Currency Selector */}
            <div className="relative group cursor-pointer">
              <span className="flex items-center gap-1 hover:text-white">
                <span>{currency}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </span>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded shadow-lg py-1 z-50 text-slate-200 min-w-20">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className="w-full text-left px-3 py-1 text-xs hover:bg-slate-700 block"
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('KHR')}
                  className="w-full text-left px-3 py-1 text-xs hover:bg-slate-700 block"
                >
                  KHR (៛)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

