import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Store,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  DollarSign,
  Truck,
  Building2,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  User,
  Lock,
  Mail,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { sellerService, type SellerApplicationData, type SellerApplyPayload } from '@/services/seller.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const CAMBODIA_CITIES = [
  'Phnom Penh (រាជធានីភ្នំពេញ)',
  'Siem Reap (ខេត្តសៀមរាប)',
  'Battambang (ខេត្តបាត់ដំបង)',
  'Preah Sihanouk / Sihanoukville (ខេត្តព្រះសីហនុ)',
  'Kampong Cham (ខេត្តកំពង់ចាម)',
  'Kandal (ខេត្តកណ្តាល)',
  'Kampot (ខេត្តកំពត)',
  'Poipet / Banteay Meanchey (ខេត្តបន្ទាយមានជ័យ)',
  'Takeo (ខេត្តតាកែវ)',
  'Other Province (បណ្តាខេត្តផ្សេងទៀត)',
]

const STORE_CATEGORIES = [
  'Consumer Electronics & Gadgets (គ្រឿងអេឡិចត្រូនិក)',
  'Smartphones & Mobile Tech (ទូរស័ព្ទ & ថេប្លេត)',
  'Fashion & Luxury Apparel (សម្លៀកបំពាក់ & ម៉ូដ)',
  'Audio, Acoustics & Headphones (កាស & ឧបករណ៍បំពងសម្លេង)',
  'Drones, Cameras & Photography (ដ្រូន & កាមេរ៉ា)',
  'Home, Kitchen & Smart Living (សម្ភារៈគេហដ្ឋាន)',
  'Beauty, Cosmetics & Personal Care (គ្រឿងសម្អាង)',
  'General Universal Merchandise (ទំនិញទូទៅ)',
]

export function JoinSellerPage() {
  const { toast } = useToast()
  const { t } = useShopEngagement()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(() => authService.getStoredUser())

  const [existingApp, setExistingApp] = useState<SellerApplicationData | null>(null)
  const [isSellerRole, setIsSellerRole] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [storeName, setStoreName] = useState('')
  const [category, setCategory] = useState(STORE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [city, setCity] = useState(CAMBODIA_CITIES[0])
  const [address, setAddress] = useState('')
  const [bankName, setBankName] = useState('ABA Bank')
  const [bakongId, setBakongId] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Guest Registration State (if user is not logged in)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPassword, setGuestPassword] = useState('')

  useEffect(() => {
    const checkApp = async () => {
      setLoadingInitial(true)
      try {
        const res = await sellerService.getMyApplication()
        if (res?.data) {
          setExistingApp(res.data)
          setStoreName(res.data.store_name || '')
          setCategory(res.data.category || STORE_CATEGORIES[0])
          setDescription(res.data.description || '')
          setPhone(res.data.phone || '')
          setTelegramUsername(res.data.telegram_username || '')
          setCity(res.data.city || CAMBODIA_CITIES[0])
          setAddress(res.data.address || '')
          setBankName(res.data.bank_name || 'ABA Bank')
          setBakongId(res.data.bakong_account_id || '')
          setLogoUrl(res.data.logo_url || '')
        }
        if (res?.is_seller) {
          setIsSellerRole(true)
        }
      } catch {
        // Guest user or offline
      } finally {
        setLoadingInitial(false)
      }
    }

    checkApp()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!storeName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a Store / Brand Name.', type: 'error' })
      return
    }
    if (!phone.trim()) {
      toast({ title: 'Validation Error', description: 'Please provide a contact phone number.', type: 'error' })
      return
    }

    if (!currentUser) {
      if (!guestEmail.trim() || !guestPassword.trim() || !guestName.trim()) {
        toast({
          title: 'Account Required',
          description: 'Please enter your Full Name, Email, and Password to create your merchant login.',
          type: 'error',
        })
        return
      }
    }

    setSubmitting(true)
    try {
      const payload: SellerApplyPayload = {
        store_name: storeName.trim(),
        category,
        description: description.trim(),
        phone: phone.trim(),
        telegram_username: telegramUsername.trim() || undefined,
        city,
        address: address.trim() || undefined,
        bank_name: bankName,
        bakong_account_id: bakongId.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
      }

      if (!currentUser) {
        payload.name = guestName.trim()
        payload.email = guestEmail.trim()
        payload.password = guestPassword.trim()
      }

      const res = await sellerService.apply(payload)
      if (res?.data) {
        setExistingApp(res.data)
      }

      toast({
        title: '🎉 Seller Application Submitted!',
        description: res?.message || 'Your application is now under review by TYUSHOP Administration.',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err?.message || 'Failed to submit seller application. Please check your inputs.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
      {/* Hero Header Banner with Gradient Animation */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white py-16 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.2),transparent_70%)] pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md animate-in fade-in zoom-in-95 duration-500">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{t('TYUSHOP Multi-Vendor Merchant Partner Program', 'កម្មវិធីដៃគូអ្នកលក់ផ្លូវការលើ TYUSHOP')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {t('Grow Your Business Across Cambodia', 'ពង្រីកអាជីវកម្មរបស់អ្នកទូទាំងប្រទេសកម្ពុជា')}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t(
              'Join Cambodia’s flagship multi-vendor marketplace. Access over 50,000 active shoppers, nationwide express GPS delivery dispatch, and instant 0% fee Bakong KHQR daily payouts.',
              'ចូលរួមជាមួយផ្សារទំនើបអនឡាញ TYUSHOP! ទទួលបានអតិថិជនជាង ៥០,០០០ នាក់ សេវាដឹកជញ្ជូនរហ័សទូទាំងប្រទេស និងទូទាត់ប្រាក់ភ្លាមៗតាម Bakong KHQR ឥតគិតកម្រៃជើងសារ។'
            )}
          </p>

          {/* Quick Perks Pill Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 0% Listing Setup Fee
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <Zap className="w-4 h-4 text-amber-400" /> Instant Bakong Settlement
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <Truck className="w-4 h-4 text-blue-400" /> Fleet Courier Pickup
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Dedicated Seller Hub
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-8 relative z-20 space-y-8">
        {/* EXISTING APPLICATION STATUS CALLOUT BANNER */}
        {existingApp && (
          <div className="rounded-3xl border shadow-xl overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    existingApp.status === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : existingApp.status === 'rejected'
                      ? 'bg-rose-500/15 text-rose-600'
                      : 'bg-amber-500/15 text-amber-600 animate-pulse'
                  }`}
                >
                  {existingApp.status === 'approved' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : existingApp.status === 'rejected' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                      Store: {existingApp.store_name}
                    </h2>
                    <Badge
                      className={`text-xs font-bold uppercase ${
                        existingApp.status === 'approved'
                          ? 'bg-emerald-600 text-white'
                          : existingApp.status === 'rejected'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {existingApp.status === 'approved'
                        ? 'Approved & Verified ✓'
                        : existingApp.status === 'rejected'
                        ? 'Application Rejected'
                        : 'Under Review (រង់ចាំការអនុម័ត)'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {existingApp.status === 'approved' &&
                      'Congratulations! Your seller store is active. You can now list products, manage orders, and create promotional discount coupons.'}
                    {existingApp.status === 'pending' &&
                      'Your merchant membership is in the queue for Admin review. Review typically completes in 2–4 hours.'}
                    {existingApp.status === 'rejected' &&
                      `Admin feedback: "${existingApp.rejection_reason || 'Please update your business information.'}". Update your details below to re-submit.`}
                  </p>
                </div>
              </div>

              {existingApp.status === 'approved' && (
                <Link to="/dashboard/seller" className="shrink-0">
                  <Button className="rounded-xl h-10 px-5 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                    <Store className="w-4 h-4" /> Go to Seller Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* APPLICATION FORM CARD */}
        {(!existingApp || existingApp.status !== 'approved') && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-6 sm:p-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <span>
                  {existingApp
                    ? t('Update Seller Member Profile', 'កែប្រែព័ត៌មានអ្នកលក់')
                    : t('Apply for Merchant Membership', 'ពាក្យស្នើសុំចុះឈ្មោះជាសមាជិកអ្នកលក់')}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t(
                  'Fill out your store details. Once submitted, our Admin team will review and activate your seller permissions.',
                  'បំពេញព័ត៌មានហាងរបស់អ្នក។ ក្រុមការងារ Admin នឹងត្រួតពិនិត្យ និងបើកសិទ្ធិអ្នកលក់ជូនអ្នកភ្លាមៗ។'
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* If user is not logged in, ask for login credentials */}
              {!currentUser && (
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Step 1: Create Your Merchant Login Account (គណនីចូលប្រព័ន្ធ)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Your Full Name</label>
                      <Input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Sokha Chan"
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                      <Input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="sokha@gmail.com"
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Account Password</label>
                      <Input
                        type="password"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: Store Identity */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Store Identity & Branding (អត្តសញ្ញាណហាង)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Store / Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. MegaTech Official Store"
                      className="rounded-xl text-xs h-10"
                      required
                    />
                    {storeName && (
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        Preview URL: tyushop.blog/store/{storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Primary Merchandise Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs h-10 px-3 font-medium"
                    >
                      {STORE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Store Bio / Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe what products your store specializes in, warranties provided, etc..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs p-3 font-medium focus:ring-2 focus:ring-primary/40 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* SECTION: Contact & Physical Location */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" /> Contact & Location in Cambodia (ទំនាក់ទំនង & ទីតាំង)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Business Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+855 12 888 999"
                      className="rounded-xl text-xs h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Telegram Contact (@username)
                    </label>
                    <Input
                      type="text"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@MegaTechStore"
                      className="rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      City / Province <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs h-10 px-3 font-medium"
                    >
                      {CAMBODIA_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Physical Store Address / Warehouse Pickup Location
                  </label>
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Street 310, BKK1, Chamkarmon, Phnom Penh"
                    className="rounded-xl text-xs h-10"
                  />
                  <p className="text-[11px] text-slate-400">
                    Our fleet couriers will use this address for parcel pickups when orders arrive.
                  </p>
                </div>
              </div>

              {/* SECTION: Payout & Settlement Information */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Revenue Payout & Bakong Settlement (ការបើកប្រាក់ចំណូល)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Payout Bank
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs h-10 px-3 font-medium"
                    >
                      <option value="ABA Bank">ABA Bank (National Payout Partner)</option>
                      <option value="ACLEDA Bank">ACLEDA Bank Plc.</option>
                      <option value="Bakong App">Bakong Full Wallet Account</option>
                      <option value="Wing Bank">Wing Bank Special Account</option>
                      <option value="Sathapana Bank">Sathapana Bank</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Bakong Account ID / Phone Number
                    </label>
                    <Input
                      type="text"
                      value={bakongId}
                      onChange={(e) => setBakongId(e.target.value)}
                      placeholder="e.g. sokha_tech@abab or 012888999"
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Terms agreement */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> TYUSHOP Verified Merchant Guarantee:
                </p>
                <p className="text-[11px] text-slate-500">
                  By submitting this application, you agree to list only authentic, high-quality merchandise and fulfill customer orders within 24 hours. TYUSHOP charges 0% listing fee and processes automated daily revenue transfers.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto rounded-xl h-11 px-8 text-xs font-bold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{existingApp ? 'Update & Re-Submit Application' : 'Submit Seller Application (ដាក់ពាក្យស្នើសុំ)'}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
