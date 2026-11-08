import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Coins,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Save,
  Globe,
  Lock,
  ArrowRight,
  Eye,
  Sliders,
  Sparkles,
  Store,
  ShieldCheck,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { storeSettingsService } from '@/services/storeSettings.service'

const PRESET_RATES = [
  { label: '4,000 ៛ (Fixed Base)', rate: 4000 },
  { label: '4,100 ៛ (Cambodia Standard)', rate: 4100 },
  { label: '4,120 ៛ (NBC Bank Rate)', rate: 4120 },
  { label: '4,150 ៛ (Commercial Average)', rate: 4150 },
  { label: '4,200 ៛ (Retail Peak Rate)', rate: 4200 },
]

export function AdminCurrencyPage() {
  const { toast } = useToast()
  const {
    t,
    language,
    usdToKhrRate: contextRate,
    setUsdToKhrRate: setContextRate,
    defaultCurrency: contextDefaultCurrency,
    allowedCurrencies: contextAllowedCurrencies,
    setAllowedCurrencies: setContextAllowedCurrencies,
    currencyAutoSwitchLang: contextAutoSwitch,
    setCurrencyAutoSwitchLang: setContextAutoSwitch,
    refreshCurrencySettings,
  } = useShopEngagement()

  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'KHR'>(contextDefaultCurrency || 'USD')
  const [rateInput, setRateInput] = useState<string>(String(contextRate || 4100))
  const [allowedMode, setAllowedMode] = useState<'BOTH' | 'USD_ONLY' | 'KHR_ONLY'>(
    contextAllowedCurrencies || 'BOTH'
  )
  const [autoSwitchLang, setAutoSwitchLang] = useState<boolean>(contextAutoSwitch || false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Sync initial state from context or backend
  useEffect(() => {
    let mounted = true
    setLoading(true)
    storeSettingsService
      .getAdminSettings()
      .then((data) => {
        if (!mounted) return
        if (data.default_currency) setDefaultCurrency(data.default_currency)
        if (data.usd_to_khr_rate) setRateInput(String(data.usd_to_khr_rate))
        if (data.allowed_currencies) setAllowedMode(data.allowed_currencies)
        if (typeof data.currency_auto_switch_lang === 'boolean') {
          setAutoSwitchLang(data.currency_auto_switch_lang)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const currentRateNumber = Math.max(1, Number(rateInput) || 4100)

  const handleSave = async () => {
    const rateVal = Math.max(1, Math.round(Number(rateInput) || 4100))
    setSaving(true)

    try {
      await storeSettingsService.updateCurrencySettings({
        default_currency: defaultCurrency,
        usd_to_khr_rate: rateVal,
        allowed_currencies: allowedMode,
        currency_auto_switch_lang: autoSwitchLang,
      })

      // Update local client context instantly
      setContextRate(rateVal)
      setContextAllowedCurrencies(allowedMode)
      setContextAutoSwitch(autoSwitchLang)
      await refreshCurrencySettings()

      toast({
        title: t('Currency Settings Saved! 💵', 'ការកំណត់រូបិយប័ណ្ណត្រូវបានរក្សាទុក! 💵'),
        description: t(
          `Exchange rate set to 1 USD = ${rateVal.toLocaleString()} ៛. Default currency: ${defaultCurrency}.`,
          `អត្រាប្តូរប្រាក់ត្រូវបានកំណត់ ១ ដុល្លារ = ${rateVal.toLocaleString()} ៛។ រូបិយប័ណ្ណគោល៖ ${defaultCurrency}។`
        ),
        type: 'success',
      })
    } catch (err: any) {
      // Even if offline, save locally to localStorage so store updates immediately
      setContextRate(rateVal)
      setContextAllowedCurrencies(allowedMode)
      setContextAutoSwitch(autoSwitchLang)

      toast({
        title: t('Currency Updated Locally', 'បានធ្វើបច្ចុប្បន្នភាពរូបិយប័ណ្ណក្នុងប្រព័ន្ធ'),
        description: t(
          `Rate updated to 1 USD = ${rateVal.toLocaleString()} ៛.`,
          `អត្រាប្តូរប្រាក់ត្រូវបានធ្វើបច្ចុប្បន្នភាព ១ ដុល្លារ = ${rateVal.toLocaleString()} ៛។`
        ),
        type: 'success',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefault = () => {
    setDefaultCurrency('USD')
    setRateInput('4100')
    setAllowedMode('BOTH')
    setAutoSwitchLang(false)
    toast({
      title: t('Reset to Defaults', 'កំណត់ឡើងវិញដូចដើម'),
      description: t('Default: USD ($), Rate: 4,100 ៛, Both currencies allowed.', 'គោល៖ USD ($), អត្រា៖ ៤,១០០ ៛, អនុញ្ញាតទាំងពីរ។'),
      type: 'info',
    })
  }

  // Sample conversions for live calculator preview
  const SAMPLE_AMOUNTS = [1, 5, 10, 25, 50, 100, 349]

  return (
    <DashboardLayout
      roleTitle="Currency & Store Settings"
      roleSlug="admin"
      roleColor="text-indigo-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                {t('Admin Governance', 'ការគ្រប់គ្រង Admin')}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">StoreSetting API v1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <Coins className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              {t('Currency & Exchange Rate Customization', 'ការកំណត់រូបិយប័ណ្ណ & អត្រាប្តូរប្រាក់ (USD / KHR)')}
            </h1>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              {t(
                'Customize the base currency, Cambodian market exchange rate (USD to KHR), and shopper currency visibility across the entire catalog, cart, Bakong KHQR, and mobile app.',
                'កំណត់រូបិយប័ណ្ណគោល អត្រាប្តូរប្រាក់ទីផ្សារកម្ពុជា (USD ទៅ KHR) និងគោលការណ៍បង្ហាញតម្លៃទំនិញលើកាតាឡុក កន្ត្រកទំនិញ និងកូដទូទាត់ Bakong KHQR។'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefault}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('Reset Defaults', 'កំណត់ដូចដើម')}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 px-5 h-9"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t('Save Currency Settings', 'រក្សាទុកការកំណត់')}
            </Button>
          </div>
        </div>

        {/* SECTION 1: PRIMARY CURRENCY & EXCHANGE RATE CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Configuration Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Setting 1: Base / Default Store Currency */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t('1. Default Store Currency', '១. រូបិយប័ណ្ណគោលរបស់ហាង')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t(
                    'Select which currency prices are displayed in by default for visitors.',
                    'ជ្រើសរើសរូបិយប័ណ្ណដែលត្រូវបង្ហាញដំបូងដល់អតិថិជនពេលចូលទស្សនាហាង។'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option USD */}
                  <div
                    onClick={() => setDefaultCurrency('USD')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      defaultCurrency === 'USD'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
                        $
                      </div>
                      {defaultCurrency === 'USD' && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="font-black text-sm text-foreground flex items-center gap-1.5">
                        <span>USD ($)</span>
                        <Badge variant="outline" className="text-[10px]">US Dollar</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t(
                          'International pricing standard. Direct support for Bakong KHQR USD accounts.',
                          'ស្តង់ដារអន្តរជាតិ។ ទូទាត់ផ្ទាល់ជាមួយគណនី Bakong KHQR USD។'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Option KHR */}
                  <div
                    onClick={() => setDefaultCurrency('KHR')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      defaultCurrency === 'KHR'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg">
                        ៛
                      </div>
                      {defaultCurrency === 'KHR' && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="font-black text-sm text-foreground flex items-center gap-1.5">
                        <span>KHR (៛)</span>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30 text-[10px]">
                          Khmer Riel
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t(
                          'National currency of Cambodia. Ideal for local shoppers and Bakong KHR accounts.',
                          'រូបិយប័ណ្ណជាតិនៃប្រទេសកម្ពុជា។ ងាយស្រួលសម្រាប់អតិថិជនក្នុងស្រុក។'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setting 2: Custom Exchange Rate (USD to KHR) */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    {t('2. Custom Exchange Rate (1 USD = ? KHR)', '២. អត្រាប្តូរប្រាក់ (១ ដុល្លារ = ប៉ុន្មានរៀល)')}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    1$ = {currentRateNumber.toLocaleString()} ៛
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {t(
                    'Input your custom exchange rate. All product prices and cart calculations automatically use this formula.',
                    'បញ្ចូលអត្រាប្តូរប្រាក់តាមតម្រូវការ។ តម្លៃទំនិញទាំងអស់នឹងត្រូវគណនាដោយស្វ័យប្រវត្តិតាមអត្រានេះ។'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute left-3.5 top-3 text-xs font-bold text-muted-foreground pointer-events-none">
                      1 USD ($) =
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="h-11 rounded-xl pl-24 pr-12 text-sm font-black font-mono tracking-wide"
                      placeholder="4100"
                    />
                    <div className="absolute right-3.5 top-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 pointer-events-none">
                      KHR (៛)
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {t('Market Quick Presets (Click to Apply):', 'អត្រាទីផ្សារពេញនិយម (ចុចដើម្បីជ្រើសរើស)៖')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_RATES.map((preset) => (
                      <button
                        key={preset.rate}
                        type="button"
                        onClick={() => setRateInput(String(preset.rate))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentRateNumber === preset.rate
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-card hover:bg-muted text-foreground border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setting 3: Shopper Visibility Policy & Auto-Switch */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {t('3. Shopper Currency Visibility Policy', '៣. គោលការណ៍ជ្រើសរើសរូបិយប័ណ្ណរបស់អតិថិជន')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t(
                    'Control whether customers can switch currencies freely or lock the storefront to a single currency.',
                    'កំណត់ថាតើអតិថិជនអាចប្តូររូបិយប័ណ្ណដោយសេរី ឬចាក់សោរហាងឱ្យបង្ហាញតែមួយរូបិយប័ណ្ណ។'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2.5">
                  {/* BOTH */}
                  <label
                    onClick={() => setAllowedMode('BOTH')}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      allowedMode === 'BOTH'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allowedMode"
                      checked={allowedMode === 'BOTH'}
                      onChange={() => setAllowedMode('BOTH')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground">
                        {t('Dual Currency: Allow Both USD ($) & KHR (៛) — Recommended', 'អនុញ្ញាតទាំងពីរ៖ USD ($) & KHR (៛) — ណែនាំ')}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t(
                          'Shoppers can freely toggle between USD and KHR using the navbar currency selector dropdown.',
                          'អតិថិជនអាចចុចប្តូររវាង USD និង KHR ដោយសេរីនៅលើ Navbar ផ្នែកខាងលើ។'
                        )}
                      </p>
                    </div>
                  </label>

                  {/* USD ONLY */}
                  <label
                    onClick={() => setAllowedMode('USD_ONLY')}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      allowedMode === 'USD_ONLY'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allowedMode"
                      checked={allowedMode === 'USD_ONLY'}
                      onChange={() => setAllowedMode('USD_ONLY')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground">
                        {t('Strict USD Only ($)', 'បង្ហាញតែប្រាក់ដុល្លារ USD ($)')}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t('Lock entire storefront to display all prices solely in US Dollars ($).', 'ចាក់សោរបង្ហាញតម្លៃទាំងអស់ជាប្រាក់ដុល្លារ ($)។')}
                      </p>
                    </div>
                  </label>

                  {/* KHR ONLY */}
                  <label
                    onClick={() => setAllowedMode('KHR_ONLY')}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      allowedMode === 'KHR_ONLY'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allowedMode"
                      checked={allowedMode === 'KHR_ONLY'}
                      onChange={() => setAllowedMode('KHR_ONLY')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground">
                        {t('Strict Khmer Riel Only (៛)', 'បង្ហាញតែប្រាក់រៀល KHR (៛)')}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t('Lock entire storefront to display all prices solely in Khmer Riel (៛).', 'ចាក់សោរបង្ហាញតម្លៃទាំងអស់ជាប្រាក់រៀល (៛)។')}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Auto Switch with Language */}
                <div className="pt-2 border-t flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      {t('Auto-Switch Currency with Language', 'ប្តូររូបិយប័ណ្ណស្វ័យប្រវត្តិតាមភាសា')}
                    </span>
                    <span className="text-[11px] text-muted-foreground block leading-snug">
                      {t(
                        'Automatically switch to KHR (៛) when Khmer is selected, and USD ($) when English is selected.',
                        'ពេលអតិថិជនជ្រើសរើសភាសាខ្មែរ បង្ហាញជាប្រាក់រៀលដោយស្វ័យប្រវត្តិ។'
                      )}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSwitchLang}
                    onChange={(e) => setAutoSwitchLang(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Live Storefront Impact & Price Calculator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Interactive Conversion Calculator */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white">
              <CardHeader className="border-b border-white/10 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {t('Live Price Conversion Preview', 'ផ្ទាំងគណនាតម្លៃទំនិញផ្ទាល់')}
                  </CardTitle>
                  <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-mono">
                    1$ = {currentRateNumber.toLocaleString()} ៛
                  </Badge>
                </div>
                <CardDescription className="text-slate-300 text-[11px]">
                  {t(
                    'Real-time simulation of how products will be priced across your store:',
                    'ការគណនាក្លែងធ្វើផ្ទាល់នូវតម្លៃទំនិញលើហាងរបស់អ្នក៖'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {SAMPLE_AMOUNTS.map((usd) => {
                  const khr = Math.round((usd * currentRateNumber) / 100) * 100
                  return (
                    <div
                      key={usd}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs"
                    >
                      <span className="font-mono font-bold text-indigo-200">
                        ${usd.toFixed(2)} USD
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-black text-amber-300 text-sm">
                        {khr.toLocaleString()} ៛ KHR
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Navbar Selector Dropdown Simulation */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t('Storefront Navbar Appearance', 'ទម្រង់បង្ហាញនៅលើ Navbar របស់ហាង')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('How customers will see the currency selector on the top bar:', 'ទម្រង់ដែលអតិថិជននឹងមើលឃើញនៅរបារខាងលើ៖')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Top Bar Preview:</span>
                  <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    <span className="font-bold text-white">
                      {defaultCurrency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}
                    </span>
                    <span className="text-[10px] text-indigo-300 font-mono">
                      (1$ = {currentRateNumber.toLocaleString()}៛)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Bakong KHQR Auto-Exchange</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t(
                      `When a customer scans KHQR, both USD ($) and official NBC KHR (៛) equivalents are calculated with this 1$ = ${currentRateNumber.toLocaleString()} ៛ rate for zero payment discrepancies.`,
                      `ពេលអតិថិជនស្កេនកូដ KHQR ចំនួនទឹកប្រាក់ទាំង USD និង KHR នឹងត្រូវបានគណនាដោយស្វ័យប្រវត្តិតាមអត្រា ១$ = ${currentRateNumber.toLocaleString()} ៛ យ៉ាងសុក្រឹត។`
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-2xl h-11 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('Apply & Publish Changes Now', 'រក្សាទុក & ផ្សព្វផ្សាយការផ្លាស់ប្តូរ')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
