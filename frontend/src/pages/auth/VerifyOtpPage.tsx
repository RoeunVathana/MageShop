import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, RotateCcw, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function VerifyOtpPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || 'your email'
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(60)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useShopEngagement()

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleInputChange = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[idx] = value.slice(-1)
    setOtp(newOtp)

    // Automatically focus next input box
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const nextOtp = ['', '', '', '', '', '']
    for (let i = 0; i < 6; i++) {
      nextOtp[i] = pasted[i] || ''
    }
    setOtp(nextOtp)
    const focusIdx = Math.min(5, pasted.length)
    inputRefs.current[focusIdx]?.focus()
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullOtp = otp.join('')
    if (fullOtp.length < 6) {
      toast({
        title: t('Incomplete OTP', 'OTP មិនទាន់ពេញ'),
        description: t('Please enter all 6 digits of the code.', 'សូមបញ្ចូលលេខកូដទាំង ៦ ខ្ទង់។'),
        type: 'warning',
      })
      return
    }

    setIsVerifying(true)
    try {
      const res = await authService.verifyOtp(email, fullOtp)
      const token = res.data?.reset_token || (res as any)?.reset_token
      toast({
        title: t('OTP Verified Successfully', 'បានផ្ទៀងផ្ទាត់ OTP ជោគជ័យ'),
        description: t('Code confirmed. Please set your new password.', 'កូដត្រូវបានបញ្ជាក់។ សូមកំណត់ពាក្យសម្ងាត់ថ្មី។'),
        type: 'success',
      })
      navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
    } catch (err: any) {
      toast({
        title: t('Verification Failed', 'ការផ្ទៀងផ្ទាត់បរាជ័យ'),
        description: err.message || err.response?.data?.message || t('Invalid or expired verification code.', 'កូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ ឬផុតកំណត់។'),
        type: 'error',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    try {
      await authService.forgotPassword(email)
      setCountdown(60)
      toast({
        title: t('Code Resent', 'បានផ្ញើកូដម្តងទៀត'),
        description: t('A new 6-digit verification code has been dispatched.', 'កូដផ្ទៀងផ្ទាត់ថ្មី ៦ ខ្ទង់ត្រូវបានផ្ញើ។'),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Resend Failed', 'ការផ្ញើម្តងទៀតបរាជ័យ'),
        description: err.message || err.response?.data?.message || t('Please wait before requesting another code.', 'សូមរង់ចាំសិន មុនស្នើកូដថ្មី។'),
        type: 'error',
      })
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
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">{t('Verify Six-Digit OTP', 'ផ្ទៀងផ្ទាត់ OTP ៦ ខ្ទង់')}</CardTitle>
          <CardDescription className="text-xs">
            {t('We sent a verification code to', 'យើងបានផ្ញើកូដផ្ទៀងផ្ទាត់ទៅ')} <strong className="text-foreground">{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
            <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>{t('Security Verification:', 'ការផ្ទៀងផ្ទាត់សុវត្ថិភាព៖')}</strong> {t('Enter or paste the 6-digit OTP sent to your email (expires in 5 minutes, max 5 attempts).', 'បញ្ចូល ឬបិទភ្ជាប់ OTP ៦ ខ្ទង់ដែលបានផ្ញើទៅអ៊ីមែល (ផុតកំណត់ក្នុង ៥ នាទី និងព្យាយាមបាន ៥ ដង)។')}
            </span>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            {/* 6-digit OTP Inputs */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className="w-11 h-12 text-center text-lg font-bold rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              ))}
            </div>

            <Button type="submit" disabled={isVerifying} className="w-full rounded-lg font-semibold shadow-md">
              {isVerifying ? t('Verifying Code...', 'កំពុងផ្ទៀងផ្ទាត់កូដ...') : t('Verify & Continue', 'ផ្ទៀងផ្ទាត់ និងបន្ត')}
            </Button>
          </form>

          {/* Resend Code & Countdown */}
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            {countdown > 0 ? (
              <p>
                {t('Resend code in', 'ផ្ញើកូដម្តងទៀតក្នុង')} <strong className="text-primary font-bold">{countdown}s</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {t('Resend 6-Digit Code', 'ផ្ញើកូដ ៦ ខ្ទង់ម្តងទៀត')}
              </button>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('Back to Sign In', 'ត្រឡប់ទៅចូល')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
