import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { toast } = useToast()
  const { t, language, setLanguage } = useShopEngagement()

  // Process incoming Google OAuth Callback tokens or errors
  useEffect(() => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')
    const googleUserParam = searchParams.get('google_user')

    if (errorParam) {
      toast({
        title: t('Google Sign-In Notice', 'ដំណឹងការចូលតាម Google'),
        description: decodeURIComponent(errorParam),
        type: 'error',
      })
      navigate('/login', { replace: true })
      return
    }

    if (token) {
      setLoading(true)
      let parsedUser: any = null
      if (googleUserParam) {
        try {
          parsedUser = JSON.parse(decodeURIComponent(googleUserParam))
        } catch {
          // ignore parsing error
        }
      }

      if (parsedUser) {
        authService.saveSession(parsedUser, token)
      }

      // Fetch fresh authenticated profile from backend
      authService
        .getCurrentUser()
        .then((res) => {
          const freshUser = res?.data?.user || parsedUser
          if (freshUser) {
            authService.saveSession(freshUser, token)
          }

          toast({
            title: t('Sign In Successful', 'ចូលប្រើប្រាស់បានជោគជ័យ'),
            description: t('Signed in successfully with your Google account!', 'បានចូលប្រើប្រាស់ដោយជោគជ័យតាមរយៈគណនី Google!'),
            type: 'success',
          })

          if (redirectParam) {
            navigate(redirectParam)
          } else if (authService.isAdmin(freshUser)) {
            navigate('/dashboard/admin')
          } else {
            navigate('/')
          }
        })
        .catch(() => {
          if (parsedUser) {
            toast({
              title: t('Sign In Successful', 'ចូលប្រើប្រាស់បានជោគជ័យ'),
              description: t('Signed in with Google!', 'បានចូលតាម Google!'),
              type: 'success',
            })
            if (redirectParam) {
              navigate(redirectParam)
            } else if (authService.isAdmin(parsedUser)) {
              navigate('/dashboard/admin')
            } else {
              navigate('/')
            }
          }
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [searchParams])

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
    setLoading(true)
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    const apiBase = isLocal
      ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1')
      : 'https://api.tyushop.blog/api/v1'
    window.location.href = `${apiBase}/auth/google/redirect`
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative bg-slate-50/60 dark:bg-slate-950/80 transition-colors">
      {/* Top Controls: Language Switcher + Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <LanguageSwitcher variant="pill" />
        <ThemeToggle />
      </div>

      <Card className="max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-5 pt-8 px-6 sm:px-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mx-auto mb-1 group" aria-label="TYUSHOP Home">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
              <Logo size="lg" showText={false} />
            </div>
          </Link>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
            {t('Sign In to TYUSHOP', 'ចូលប្រើប្រាស់ TYUSHOP')}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            {t(
              'Access your multi-vendor account, orders, and dashboard',
              'ចូលទៅកាន់គណនីអតិថិជន ការបញ្ជាទិញ និងផ្ទាំងគ្រប់គ្រងរបស់អ្នក'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 sm:px-8 pb-8">
          {/* Phase S1 Protected Security Badge */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>{t('Phase S1 Protected:', 'សុវត្ថិភាពខ្ពស់ S1:')}</strong>{' '}
              {t(
                'First-party HttpOnly cookie session via Laravel Sanctum with Argon2id hashing, anti-enumeration, and brute-force throttling.',
                'ការចូលប្រើប្រាស់មានសុវត្ថិភាពខ្ពស់ ត្រូវបានការពារដោយការអ៊ិនគ្រីប SSL ២៥៦ ប៊ីត និងទប់ស្កាត់ការវាយប្រហារ។'
              )}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
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

            {/* Password Field */}
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
                  className={`h-11 rounded-xl pl-9 pr-10 text-xs transition-all ${
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
            <div className="flex items-center gap-2.5 pt-0.5">
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
              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary/20 gap-2 mt-1 cursor-pointer"
            >
              {loading ? (
                t('Validating...', 'កំពុងពិនិត្យ...')
              ) : (
                <>
                  <span>{t('Sign In', 'ចូលប្រើប្រាស់')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Social Auth Divider */}
          <div className="relative my-3">
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

          {/* Registration Link */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-slate-100 dark:border-slate-800">
            {t("Don't have an account yet?", 'មិនទាន់មានគណនីមែនទេ?')}{' '}
            <Link to="/register" className="font-bold text-primary hover:underline ml-1">
              {t('Create an account', 'បង្កើតគណនីថ្មី')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
