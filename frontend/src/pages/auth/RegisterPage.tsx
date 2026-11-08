import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, User, Phone, ShoppingBag, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

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
        title: 'Account Created Successfully! 🎉',
        description: 'Welcome to MegaCommerce! Please sign in with your credentials.',
        type: 'success',
      })
      navigate('/login')
    } catch (err: any) {
      toast({
        title: 'Registration Failed',
        description: err.message || err.response?.data?.message || 'Unable to register account. Please check your details.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="max-w-md w-full shadow-xl border">
        <CardHeader className="space-y-2 text-center pb-6">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mx-auto">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-black tracking-tight">Create Account</CardTitle>
          <CardDescription className="text-xs">
            Join MegaCommerce to shop, save wishlist, or register your vendor store
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Phase 1 UI Mode:</strong> Zod schema validation ensures rigorous client-side checks for name, email, phone, and passwords.
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Full Name</label>
              <div className="relative">
                <Input
                  placeholder="Jane Doe"
                  {...register('name')}
                  className={errors.name ? 'border-destructive pl-9' : 'pl-9'}
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.name && (
                <p className="text-[11px] font-medium text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive pl-9' : 'pl-9'}
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.email && (
                <p className="text-[11px] font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Phone Number</label>
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="+855 12 345 678"
                  {...register('phone')}
                  className={errors.phone ? 'border-destructive pl-9' : 'pl-9'}
                />
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.phone && (
                <p className="text-[11px] font-medium text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
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
              <label className="text-xs font-semibold text-foreground">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive pl-9' : 'pl-9'}
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] font-medium text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="space-y-1 pt-1">
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  {...register('terms')}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-normal cursor-pointer">
                  I agree to the <a href="#terms" className="text-primary hover:underline">Terms of Service</a> and{' '}
                  <a href="#privacy" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>
              {errors.terms && (
                <p className="text-[11px] font-medium text-destructive">{errors.terms.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" disabled={loading} className="w-full rounded-lg font-semibold shadow-md mt-2">
              {loading ? 'Validating Account...' : 'Create MegaCommerce Account'}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
