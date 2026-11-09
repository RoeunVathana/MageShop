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
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Sparkles,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
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

  const [googleConfigModalOpen, setGoogleConfigModalOpen] = useState(false)

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { signInWithPopup } = await import('firebase/auth')
      const { auth, googleAuthProvider } = await import('@/lib/firebase')
      const result = await signInWithPopup(auth, googleAuthProvider)
      const fbUser = result.user
      const idToken = await fbUser.getIdToken()

      const res = await authService.loginWithFirebase({
        id_token: idToken,
        email: fbUser.email,
        name: fbUser.displayName,
        avatar: fbUser.photoURL,
        uid: fbUser.uid,
      })

      toast({
        title: t('Account Created & Signed In', 'បានបង្កើតគណនី និងចូលដោយជោគជ័យ'),
        description: t(`Welcome to TYUSHOP, ${fbUser.displayName || fbUser.email}!`, `សូមស្វាគមន៍មកកាន់ TYUSHOP, ${fbUser.displayName || fbUser.email}!`),
        type: 'success',
      })

      if (authService.isAdmin(res.data?.user)) {
        navigate('/dashboard/admin')
      } else {
        navigate('/')
      }
    } catch (popupErr: any) {
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        setLoading(false)
        return
      }
      console.warn('Google Auth Error:', popupErr)

      const isConfigError =
        popupErr?.code === 'auth/configuration-not-found' ||
        popupErr?.message?.includes('configuration-not-found') ||
        popupErr?.message?.includes('CONFIGURATION_NOT_FOUND')

      if (isConfigError) {
        setGoogleConfigModalOpen(true)
        toast({
          title: t('Google Sign-In Remote Config Notice', 'ដំណឹងកំណត់ Google Sign-In'),
          description: t(
            'Google Sign-In is not enabled yet in Firebase Console for project tyushop-5aea2.',
            'Google Sign-In មិនទាន់ត្រូវបានបើកដំណើរការក្នុង Firebase Console សម្រាប់គម្រោង tyushop-5aea2 នៅឡើយទេ។'
          ),
          type: 'warning',
        })
      } else {
        toast({
          title: t('Google Sign-Up Failed', 'ការចុះឈ្មោះតាម Google មិនបានជោគជ័យ'),
          description: popupErr?.message || t('Could not authenticate with Google. Please try again.', 'មិនអាចចូលតាម Google បានទេ សូមព្យាយាមម្តងទៀត។'),
          type: 'error',
        })
      }
    } finally {
      setLoading(false)
    }
  }

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
        description: t(
          'Welcome to TYUSHOP! Please sign in with your credentials.',
          'សូមស្វាគមន៍មកកាន់ TYUSHOP! សូមចូលប្រើប្រាស់។'
        ),
        type: 'success',
      })
      const loginTarget = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'
      navigate(loginTarget)
    } catch (err: any) {
      let errorDescription = t(
        'Unable to register account. Please check your details.',
        'មិនអាចចុះឈ្មោះបានទេ។ សូមពិនិត្យព័ត៌មានម្តងទៀត។'
      )

      const emailTaken = err.errors?.email?.some((m: string) =>
        m.toLowerCase().includes('already been taken')
      )
      const phoneTaken = err.errors?.phone_number?.some((m: string) =>
        m.toLowerCase().includes('already been taken')
      )

      if (emailTaken && phoneTaken) {
        errorDescription = t(
          'This email and phone number are already registered. Please sign in instead.',
          'អ៊ីមែល និងលេខទូរស័ព្ទនេះត្រូវបានចុះឈ្មោះរួចហើយ។ សូមចូលប្រើប្រាស់ជំនួសវិញ។'
        )
      } else if (emailTaken) {
        errorDescription = t(
          'This email address is already registered. Please sign in instead.',
          'អ៊ីមែលនេះត្រូវបានចុះឈ្មោះរួចហើយ។ សូមចូលប្រើប្រាស់ជំនួសវិញ។'
        )
      } else if (phoneTaken) {
        errorDescription = t(
          'This phone number is already registered. Please sign in instead.',
          'លេខទូរស័ព្ទនេះត្រូវបានចុះឈ្មោះរួចហើយ។ សូមចូលប្រើប្រាស់ជំនួសវិញ។'
        )
      } else if (err.errors) {
        const firstErrorKey = Object.keys(err.errors)[0]
        if (firstErrorKey && err.errors[firstErrorKey]?.[0]) {
          errorDescription = err.errors[firstErrorKey][0]
        }
      } else if (err.message && !err.message.includes('The given data was invalid')) {
        errorDescription = err.message
      }

      toast({
        title: t('Registration Failed', 'ការចុះឈ្មោះមិនបានជោគជ័យ'),
        description: errorDescription,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative bg-slate-50/60 dark:bg-slate-950/80 transition-colors">
      {/* Top Controls: Language Switcher + Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <LanguageSwitcher variant="pill" />
        <ThemeToggle />
      </div>

      <Card className="max-w-lg w-full shadow-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-4 pt-8 px-6 sm:px-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mx-auto mb-1 group" aria-label="TYUSHOP Home">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
              <Logo size="lg" showText={false} />
            </div>
          </Link>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
            {t('Create TYUSHOP Account', 'បង្កើតគណនី TYUSHOP')}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            {t(
              'Join TYUSHOP to shop, save wishlist, or register your vendor store',
              'ចូលរួមជាមួយ TYUSHOP ដើម្បីទិញទំនិញ រក្សាទុកទំនិញ ឬចុះឈ្មោះបើកហាងលក់'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 sm:px-8 pb-8">
          {/* Security & Validation Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>{t('Verified Buyer Protection:', 'ការការពារសុវត្ថិភាពអតិថិជន:')}</strong>{' '}
              {t(
                'Instant access to Bakong KHQR 0% fee checkout, live GPS delivery, and 100 bonus loyalty points.',
                'ទទួលបានការទូទាត់តាម Bakong KHQR ឥតគិតថ្លៃសេវា តាមដានអ្នកដឹកជញ្ជូន GPS និងពិន្ទុរង្វាន់។'
              )}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {/* ROW 1: Full Name & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  {t('Full Name', 'ឈ្មោះពេញ')}
                </label>
                <div className="relative">
                  <Input
                    placeholder={t('Sok Pheak', 'សុខ ភាព')}
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
              <div className="space-y-1">
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

            {/* ROW 2: Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                {t('Email Address', 'អាសយដ្ឋានអ៊ីមែល')}
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@example.com"
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

            {/* ROW 3: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Password */}
              <div className="space-y-1">
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
              <div className="space-y-1">
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
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.confirmPassword.message}
                  </p>
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
                <label
                  htmlFor="terms"
                  className="text-xs text-muted-foreground leading-normal cursor-pointer select-none"
                >
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
              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary/20 gap-2 mt-1 cursor-pointer"
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

          {/* Social Auth Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800" />
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
                d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{t('Sign Up with Google', 'ចុះឈ្មោះតាម Google')}</span>
          </Button>

          {/* Quick Switch to Sign In */}
          <div className="pt-2 text-center text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800">
            {t('Already have an account?', 'មានគណនីរួចហើយមែនទេ?')}{' '}
            <Link to="/login" className="font-bold text-primary hover:underline ml-1">
              {t('Sign In here', 'ចូលប្រើប្រាស់នៅទីនេះ')}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Google Sign-In Remote Config Notice Modal */}
      {googleConfigModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-4 min-h-screen py-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {t('Google Sign-In Configuration Required', 'ត្រូវការបើកដំណើរការ Google Sign-In')}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Firebase Project: <span className="font-mono font-bold">tyushop-5aea2</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGoogleConfigModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Notice Banner */}
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3.5 space-y-2 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      {t('Why did Google Sign-In fail?', 'ហេតុអ្វីបានជាការចូល Google បរាជ័យ?')}
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      {t(
                        'The error "auth/configuration-not-found" indicates that the Google Sign-In provider is not yet enabled in the Firebase Console for project tyushop-5aea2.',
                        'កំហុស "auth/configuration-not-found" បង្ហាញថា Google Sign-In មិនទាន់ត្រូវបានចុច Enable ក្នុង Firebase Console សម្រាប់គម្រោង tyushop-5aea2 នៅឡើយទេ។'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Quick Steps to Enable */}
              <div className="space-y-2">
                <div className="font-bold text-foreground">
                  <span>{t('How to Enable in Firebase (1 Minute):', 'របៀបបើកដំណើរការក្នុង Firebase (១ នាទី)៖')}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px] pl-1 leading-relaxed">
                  <li>
                    {t('Open', 'បើក')}{' '}
                    <a
                      href="https://console.firebase.google.com/project/tyushop-5aea2/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      Firebase Console Providers
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    {t(
                      'Click on "Google" in the Sign-in providers table.',
                      'ចុចលើ "Google" ក្នុងតារាង Sign-in providers។'
                    )}
                  </li>
                  <li>
                    {t(
                      'Toggle "Enable", choose support email (Vothanarern@gmail.com), and click "Save".',
                      'ចុច "Enable" រួចជ្រើសរើសអ៊ីមែលជំនួយ និងចុច "Save"។'
                    )}
                  </li>
                </ol>
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGoogleConfigModalOpen(false)}
                  className="w-full h-10 rounded-xl text-xs font-semibold"
                >
                  {t('Continue with Standard Registration', 'បន្តការចុះឈ្មោះតាមទម្រង់ធម្មតា')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
