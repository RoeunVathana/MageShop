import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address format'),
})

type ForgotFormData = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t, language, setLanguage } = useShopEngagement()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotFormData) => {
    setLoading(true)
    try {
      await authService.forgotPassword(data.email)
      toast({
        title: t('Recovery Code Dispatched', 'បានផ្ញើលេខកូដសង្គ្រោះ'),
        description: t(
          `If ${data.email} is registered, a 6-digit recovery code has been sent.`,
          `ប្រសិនបើអ៊ីមែល ${data.email} មានក្នុងប្រព័ន្ធ លេខកូដ OTP 6 ខ្ទង់ត្រូវបានផ្ញើរួចហើយ។`
        ),
        type: 'success',
      })
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`)
    } catch (err: any) {
      toast({
        title: t('Request Failed', 'សំណើមិនបានជោគជ័យ'),
        description:
          err.message ||
          err.response?.data?.message ||
          t('Unable to process recovery request. Please try again.', 'មិនអាចដំណើរការបានទេ។ សូមព្យាយាមម្តងទៀត។'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
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
      <Card className="max-w-md w-full shadow-xl border">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black">{t('Forgot Password', 'ភ្លេចពាក្យសម្ងាត់')}</CardTitle>
          <CardDescription className="text-xs">
            {t(
              "Enter the email associated with your account and we'll send a 6-digit verification code.",
              'បញ្ចូលអ៊ីមែលគណនីរបស់អ្នក ហើយយើងនឹងផ្ញើលេខកូដ OTP 6 ខ្ទង់ទៅកាន់អ៊ីមែលនោះ។'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
            <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>{t('Live 6-Digit OTP Recovery:', 'លេខកូដ OTP 6 ខ្ទង់:')}</strong>{' '}
              {t(
                'Enter your registered email below to receive a 6-digit verification code via Email (and linked Telegram account) valid for 5 minutes.',
                'បញ្ចូលអ៊ីមែលរបស់អ្នកដើម្បីទទួលលេខកូដសម្ងាត់ 6 ខ្ទង់តាមអ៊ីមែល ឬតេឡេក្រាម មានសុពលភាព ៥ នាទី។'
              )}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {t('Registered Email', 'អ៊ីមែលដែលបានចុះឈ្មោះ')}
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Vothanarern@gmail.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive pl-9' : 'pl-9'}
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.email && (
                <p className="text-[11px] font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-lg font-bold shadow-md cursor-pointer">
              {loading
                ? t('Sending OTP Code...', 'កំពុងផ្ញើលេខកូដ OTP...')
                : t('Send Verification OTP', 'ផ្ញើលេខកូដផ្ទៀងផ្ទាត់ OTP')}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('Back to Sign In', 'ត្រឡប់ទៅចូលគណនី')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

