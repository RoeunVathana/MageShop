import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'

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
        title: 'Missing Authorization Token',
        description: 'Password reset link is invalid or expired. Please request a new recovery code.',
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
        title: 'Password Updated Successfully! 🎉',
        description: 'Your password has been changed. Please sign in with your new credentials.',
        type: 'success',
      })
      navigate('/login')
    } catch (err: any) {
      toast({
        title: 'Reset Failed',
        description: err.message || err.response?.data?.message || 'Invalid or expired reset token.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full shadow-xl border">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Create New Password</CardTitle>
          <CardDescription className="text-xs">
            Choose a strong password with at least 8 characters, an uppercase letter, and a number.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Phase 1 UI Notice:</strong> Validates input via Zod schema. Real database token hash update activates in Phase 2.
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
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
              <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
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
              {loading ? 'Updating Password...' : 'Reset Password & Sign In'}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Cancel & Return to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

