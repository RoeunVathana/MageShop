import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  QrCode,
  Truck,
  Gift,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

const VALUE_PILLARS = [
  {
    icon: QrCode,
    title: 'Instant Bakong KHQR',
    desc: 'Seamless zero-fee mobile banking payments via NBC Bakong & card',
    color: 'from-rose-500 to-red-600',
  },
  {
    icon: Truck,
    title: 'Real-time GPS Delivery',
    desc: 'Live courier tracking to BKK1, Daun Penh and nationwide provinces',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Gift,
    title: 'Loyalty Reward Club',
    desc: 'Earn 5 points on every purchase; redeem 100% free items at 100 points',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: ShieldCheck,
    title: '100% Buyer Protection',
    desc: 'Authentic products with verified warranty and instant refunds',
    color: 'from-emerald-500 to-teal-600',
  },
]

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { toast } = useToast()
  const { t, language, setLanguage } = useShopEngagement()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      const res = await authService.login(data)
      toast({
        title: t('Sign In Successful', 'ចូលប្រើប្រាស់បានជោគជ័យ'),
        description: res.message || t('Welcome back to TYUSHOP!', 'សូមស្វាគមន៍មកកាន់ TYUSHOP!'),
        type: 'success',
      })

      if (redirectParam) {
        navigate(redirectParam)
      } else if (authService.isAdmin(res.data?.user)) {
        navigate('/dashboard/admin')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      toast({
        title: t('Authentication Failed', 'ការចូលប្រើប្រាស់មិនបានជោគជ័យ'),
        description: err.message || t('Invalid credentials or rate limit exceeded.', 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    window.location.href = `${apiBase}/auth/google/redirect`
  }

  const localizedValuePillars = [
    {
      icon: QrCode,
      title: t('Instant Bakong KHQR', 'ទូទាត់ភ្លាមៗតាម Bakong KHQR'),
      desc: t('Seamless zero-fee mobile banking payments via NBC Bakong & card', 'ទូទាត់តាមធនាគារដោយឥតគិតថ្លៃសេវា តាម NBC Bakong និងកាត'),
      color: 'from-rose-500 to-red-600',
    },
    {
      icon: Truck,
      title: t('Real-time GPS Delivery', 'ដឹកជញ្ជូនតាមដាន GPS ផ្ទាល់'),
      desc: t('Live courier tracking to BKK1, Daun Penh and nationwide provinces', 'តាមដានអ្នកដឹកជញ្ជូនទៅកាន់ BKK1 ដូនពេញ និងគ្រប់ខេត្តក្រុង'),
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Gift,
      title: t('Loyalty Reward Club', 'កម្មវិធីរង្វាន់ពិន្ទុអតិថិជន'),
      desc: t('Earn 5 points on every purchase; redeem 100% free items at 100 points', 'ទទួលបាន ៥ ពិន្ទុរាល់ការទិញ; ប្តូរទំនិញឥតគិតថ្លៃនៅពេលគ្រប់ ១០០ ពិន្ទុ'),
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: ShieldCheck,
      title: t('100% Buyer Protection', 'ការធានាការពារអ្នកទិញ ១០០%'),
      desc: t('Authentic products with verified warranty and instant refunds', 'ទំនិញសុទ្ធពិតប្រាកដ មានការធានាត្រឹមត្រូវ និងសងប្រាក់វិញភ្លាមៗ'),
      color: 'from-emerald-500 to-teal-600',
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative bg-slate-50/70 dark:bg-slate-950/90 transition-colors">
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLanguage(language === 'EN' ? 'KM' : 'EN')}
          className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-sm"
          title={t('Switch Language to Khmer', 'ប្តូរជាភាសាអង់គ្លេស')}
        >
          {language === 'KM' ? '🇰🇭 KM' : '🇺🇸 EN'}
        </button>
        <ThemeToggle />
      </div>

      {/* Two-Column Master Container */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-card transition-all">
        {/* LEFT COLUMN (5 Cols): Clean Brand Showcase & Customer Benefits */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Glowing Circles */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="space-y-6 relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group" aria-label="TYUSHOP Home">
              <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 group-hover:scale-105 transition-transform">
                <Logo size="md" showText={false} />
              </div>
              <div>
                <span className="text-xl font-black text-white block">TYUSHOP</span>
                <span className="text-[11px] font-medium text-indigo-300 block">{t('Flagship Cambodia', 'ផ្សារទំនើបកម្ពុជា')}</span>
              </div>
            </Link>

            <div className="space-y-2 pt-2">
              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30 text-xs px-3 py-1 font-medium gap-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                {t('Multi-Vendor Commerce 2.0', 'ប្រព័ន្ធទិញលក់ទំនិញទំនើប ២.០')}
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                {t('Welcome Back to TYUSHOP Cambodia', 'សូមស្វាគមន៍មកកាន់ TYUSHOP កម្ពុជា')}
              </h2>
              <p className="text-xs text-slate-300/90 leading-relaxed">
                {t(
                  'Sign in to manage your orders, track active courier dispatches, redeem loyalty reward points, or access your seller dashboard.',
                  'ចូលប្រើប្រាស់ដើម្បីគ្រប់គ្រងការបញ្ជាទិញ តាមដានអ្នកដឹកជញ្ជូន ប្តូរពិន្ទុរង្វាន់ ឬចូលទៅផ្ទាំងគ្រប់គ្រងអ្នកលក់។'
                )}
              </p>
            </div>

            {/* Value Pillars List */}
            <div className="space-y-3.5 pt-4">
              {localizedValuePillars.map((item, idx) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-all"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-md shadow-black/20`}
                    >
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-300/80 leading-snug pt-0.5">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Social Proof & Trust Card */}
          <div className="pt-8 relative z-10 border-t border-white/10 mt-6">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-slate-900">
                    DS
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-slate-900">
                    SC
                  </div>
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-slate-900">
                    PP
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-300">{t('10,000+ Happy Customers', 'អតិថិជនពេញចិត្ត ១០,០០០+')}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                <span>★ 4.9</span>
                <span className="text-slate-400 text-[10px]">{t('(Verified)', '(ផ្ទៀងផ្ទាត់)')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 Cols): Clean Sign In Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-card">
          <div className="space-y-6 max-w-xl mx-auto w-full">
            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-primary">
                  {t('Member Portal', 'ច្រកចូលសមាជិក')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('Secure Access', 'សុវត្ថិភាពខ្ពស់')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                {t('Sign In to TYUSHOP', 'ចូលប្រើប្រាស់ TYUSHOP')}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Access your customer account, order tracking, and vendor dashboard',
                  'ចូលទៅកាន់គណនីអតិថិជន ការតាមដានការដឹកជញ្ជូន និងផ្ទាំងគ្រប់គ្រងអ្នកលក់'
                )}
              </p>
            </div>

            {/* Clean Security Badge */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-950 dark:text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="leading-relaxed font-medium">
                {t(
                  'Secure 256-bit SSL encrypted login session with multi-layer brute-force protection.',
                  'ការចូលប្រើប្រាស់មានសុវត្ថិភាពខ្ពស់ ត្រូវបានការពារដោយការអ៊ិនគ្រីប SSL ២៥៦ ប៊ីត។'
                )}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Email Address', 'អាសយដ្ឋានអ៊ីមែល')}
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Vothanarern@gmail.com"
                    {...register('email')}
                    className={`h-11 rounded-xl pl-9 text-xs transition-all ${
                      errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.email && (
                  <p className="text-[11px] font-medium text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {t('Password', 'ពាក្យសម្ងាត់')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    {t('Forgot password?', 'ភ្លេចពាក្យសម្ងាត់?')}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`h-11 rounded-xl pl-9 pr-9 text-xs transition-all ${
                      errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] font-medium text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="remember"
                  type="checkbox"
                  {...register('remember')}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                  {t('Remember this device for 30 days', 'ចងចាំឧបករណ៍នេះសម្រាប់រយៈពេល ៣០ ថ្ងៃ')}
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 gap-2 mt-2 transition-all hover:shadow-xl cursor-pointer"
              >
                {loading ? (
                  t('Validating Credentials...', 'កំពុងពិនិត្យព័ត៌មាន...')
                ) : (
                  <>
                    <span>{t('Sign In to Account', 'ចូលប្រើប្រាស់គណនី')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Social Auth Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-3 text-muted-foreground font-bold">
                  {t('Or continue with', 'ឬចូលតាមរយៈ')}
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              className="w-full h-11 rounded-xl gap-2.5 text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{t('Continue with Google', 'ចូលតាម Google')}</span>
            </Button>

            {/* Quick Switch to Register */}
            <div className="pt-2 text-center text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800">
              {t("Don't have an account yet?", 'មិនទាន់មានគណនីមែនទេ?')}{' '}
              <Link to="/register" className="font-bold text-primary hover:underline ml-1">
                {t('Create an account', 'បង្កើតគណនីថ្មី')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
