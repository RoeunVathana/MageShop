import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[0-9]/, 'Must include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormData = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useShopEngagement()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetFormData) => {
    if (!email || !token) {
      toast({
        title: t('Missing Authorization Token', 'បាត់ Token ផ្ទៀងផ្ទាត់'),
        description: t('Password reset link is invalid or expired. Please request a new recovery code.', 'តំណកំណត់ពាក្យសម្ងាត់មិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមស្នើកូដសង្គ្រោះថ្មី។'),
        type: 'error',
      })
      navigate('/forgot-password')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({
        email,
        reset_token: token,
        password: data.password,
      })
      toast({
        title: t('Password Updated Successfully! 🎉', 'បានកែប្រែពាក្យសម្ងាត់ជោគជ័យ! 🎉'),
        description: t('Your password has been changed. Please sign in with your new credentials.', 'ពាក្យសម្ងាត់របស់អ្នកត្រូវបានកែប្រែ។ សូមចូលដោយព័ត៌មានថ្មី។'),
        type: 'success',
      })
      navigate('/login')
    } catch (err: any) {
      toast({
        title: t('Reset Failed', 'កំណត់ឡើងវិញបរាជ័យ'),
        description: err.message || err.response?.data?.message || t('Invalid or expired reset token.', 'Token មិនត្រឹមត្រូវ ឬផុតកំណត់។'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="max-w-md w-full shadow-xl border">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">{t('Create New Password', 'បង្កើតពាក្យសម្ងាត់ថ្មី')}</CardTitle>
          <CardDescription className="text-xs">
            {t('Choose a strong password with at least 8 characters, an uppercase letter, and a number.', 'ជ្រើសពាក្យសម្ងាត់រឹងមាំដែលមានយ៉ាងតិច ៨ តួ មានអក្សរធំ និងលេខ។')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>{t('Argon2id Zero-Trust Security:', 'សុវត្ថិភាព Zero-Trust ជាមួយ Argon2id៖')}</strong> {t('Your new password is encrypted with Argon2id and automatically revokes all previous active sessions.', 'ពាក្យសម្ងាត់ថ្មីត្រូវបានអ៊ិនគ្រីបដោយ Argon2id និងបិទវគ្គចាស់ទាំងអស់ដោយស្វ័យប្រវត្តិ។')}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">{t('New Password', 'ពាក្យសម្ងាត់ថ្មី')}</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('Min. 8 characters', 'យ៉ាងតិច ៨ តួ')}
                  {...register('password')}
                  className={errors.password ? 'border-destructive pl-9 pr-10' : 'pl-9 pr-10'}
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
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
              <label className="text-xs font-semibold text-foreground">{t('Confirm New Password', 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី')}</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('Repeat new password', 'បញ្ចូលម្តងទៀត')}
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive pl-9' : 'pl-9'}
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] font-medium text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-lg font-semibold shadow-md">
              {loading ? t('Updating Password...', 'កំពុងកែប្រែពាក្យសម្ងាត់...') : t('Reset Password & Sign In', 'កំណត់ពាក្យសម្ងាត់ និងចូល')}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t('Cancel & Return to Sign In', 'បោះបង់ និងត្រឡប់ទៅចូល')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

