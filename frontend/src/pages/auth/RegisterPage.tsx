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
  User,
  Phone,
  AlertCircle,
  ShieldCheck,
  Truck,
  Sparkles,
  CheckCircle2,
  Gift,
  QrCode,
  ArrowRight,
  Headphones,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address format'),
    phone: z.string().min(8, 'Phone number must be at least 8 digits'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
      .regex(/[0-9]/, 'Password must include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.literal(true, {
      message: 'You must agree to the Terms of Service to register',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

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

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    try {
      await authService.register({
        name: data.name,
        email: data.email,
        phone_number: data.phone,
        password: data.password,
      })
      toast({
        title: t('Account Created Successfully! 🎉', 'បង្កើតគណនីបានជោគជ័យ! 🎉'),
        description: t('Welcome to TYUSHOP! Please sign in with your credentials.', 'សូមស្វាគមន៍មកកាន់ TYUSHOP! សូមចូលប្រើប្រាស់។'),
        type: 'success',
      })
      const loginTarget = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'
      navigate(loginTarget)
    } catch (err: any) {
      toast({
        title: t('Registration Failed', 'ការចុះឈ្មោះមិនបានជោគជ័យ'),
        description:
          err.message ||
          err.response?.data?.message ||
          t('Unable to register account. Please check your details.', 'មិនអាចចុះឈ្មោះបានទេ។ សូមពិនិត្យព័ត៌មានម្តងទៀត។'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
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
                {t('Join Cambodia’s Premier Shopping & Vendor Hub', 'ចូលរួមជាមួយផ្សារទិញទំនិញ និងអ្នកលក់ឈានមុខនៅកម្ពុជា')}
              </h2>
              <p className="text-xs text-slate-300/90 leading-relaxed">
                {t(
                  'Create your verified account in seconds to unlock member-only flash discounts, earn free loyalty gifts, and track orders via live satellite GPS.',
                  'បង្កើតគណនីរបស់អ្នកក្នុងរយៈពេលប៉ុន្មានវិនាទី ដើម្បីទទួលបានការបញ្ចុះតម្លៃពិសេស កាដូរង្វាន់ពិន្ទុឥតគិតថ្លៃ និងតាមដានការដឹកជញ្ជូនតាម GPS ផ្ទាល់។'
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

        {/* RIGHT COLUMN (7 Cols): Clean Two-Column Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-card">
          <div className="space-y-6 max-w-xl mx-auto w-full">
            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-primary">
                  {t('Fast Registration', 'ចុះឈ្មោះរហ័ស')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('Step 1 of 1', 'ជំហាន ១ នៃ ១')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                {t('Create Account', 'បង្កើតគណនី')}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Join TYUSHOP to shop, save wishlists, or register your vendor store',
                  'ចូលរួម TYUSHOP ដើម្បីទិញទំនិញ រក្សាទុកទំនិញពេញចិត្ត ឬបើកហាងលក់'
                )}
              </p>
            </div>

            {/* Clean Security Badge */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="leading-relaxed font-medium">
                {t(
                  'Secure 256-bit encrypted registration. Your personal data and phone number are safely protected.',
                  'ការចុះឈ្មោះមានសុវត្ថិភាពខ្ពស់។ ទិន្នន័យផ្ទាល់ខ្លួន និងលេខទូរស័ព្ទត្រូវបានការពារដោយសុវត្ថិភាព។'
                )}
              </span>
            </div>

            {/* Registration Form with 2-Column Grid */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* TWO-COLUMN ROW 1: Full Name & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Full Name', 'ឈ្មោះពេញ')}
                  </label>
                  <div className="relative">
                    <Input
                      placeholder={t('Dara Sok', 'សុខ តារា')}
                      {...register('name')}
                      className={`h-11 rounded-xl pl-9 text-xs transition-all ${
                        errors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.name && (
                    <p className="text-[11px] font-medium text-destructive">{errors.name.message}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Phone Number', 'លេខទូរស័ព្ទ')}
                  </label>
                  <div className="relative">
                    <Input
                      type="tel"
                      placeholder="016 555 637"
                      {...register('phone')}
                      className={`h-11 rounded-xl pl-9 text-xs transition-all ${
                        errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] font-medium text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* FULL-WIDTH ROW 2: Email Address */}
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

              {/* TWO-COLUMN ROW 3: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Password', 'ពាក្យសម្ងាត់')}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('Min. 8 chars, 1 uppercase', 'យ៉ាងតិច ៨ តួអក្សរ')}
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

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Confirm Password', 'បញ្ជាក់ពាក្យសម្ងាត់')}
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('Repeat your password', 'បញ្ចូលពាក្យសម្ងាត់ម្តងទៀត')}
                      {...register('confirmPassword')}
                      className={`h-11 rounded-xl pl-9 pr-9 text-xs transition-all ${
                        errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] font-medium text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="space-y-1 pt-1">
                <div className="flex items-start gap-2.5">
                  <input
                    id="terms"
                    type="checkbox"
                    {...register('terms')}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-normal cursor-pointer select-none">
                    {t('I agree to the', 'ខ្ញុំយល់ព្រមតាម')}{' '}
                    <a href="#terms" className="text-primary font-semibold hover:underline">
                      {t('Terms of Service', 'លក្ខខណ្ឌប្រើប្រាស់')}
                    </a>{' '}
                    {t('and', 'និង')}{' '}
                    <a href="#privacy" className="text-primary font-semibold hover:underline">
                      {t('Privacy Policy', 'គោលការណ៍ឯកជនភាព')}
                    </a>
                  </label>
                </div>
                {errors.terms && (
                  <p className="text-[11px] font-medium text-destructive">{errors.terms.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 gap-2 mt-2 transition-all hover:shadow-xl cursor-pointer"
              >
                {loading ? (
                  t('Validating Account...', 'កំពុងពិនិត្យគណនី...')
                ) : (
                  <>
                    <span>{t('Create TYUSHOP Account', 'បង្កើតគណនី TYUSHOP')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Switch to Sign In */}
            <div className="pt-2 text-center text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800">
              {t('Already have an account?', 'មានគណនីរួចហើយមែនទេ?')}{' '}
              <Link to="/login" className="font-bold text-primary hover:underline ml-1">
                {t('Sign In here', 'ចូលប្រើប្រាស់នៅទីនេះ')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
