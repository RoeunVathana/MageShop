import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, RotateCcw, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function VerifyOtpPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || 'your email'
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(60)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const { toast } = useToast()

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullOtp = otp.join('')
    if (fullOtp.length < 6) {
      toast({
        title: 'Incomplete OTP',
        description: 'Please enter all 6 digits of the code.',
        type: 'warning',
      })
      return
    }

    setIsVerifying(true)
    try {
      const res = await authService.verifyOtp(email, fullOtp)
      const token = res.data?.reset_token || (res as any)?.reset_token
      toast({
        title: 'OTP Verified Successfully',
        description: 'Code confirmed. Please set your new password.',
        type: 'success',
      })
      navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
    } catch (err: any) {
      toast({
        title: 'Verification Failed',
        description: err.message || err.response?.data?.message || 'Invalid or expired verification code.',
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
        title: 'Code Resent',
        description: 'A new 6-digit verification code has been dispatched.',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Resend Failed',
        description: err.message || err.response?.data?.message || 'Please wait before requesting another code.',
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
          <CardTitle className="text-2xl font-black tracking-tight">Verify Six-Digit OTP</CardTitle>
          <CardDescription className="text-xs">
            We sent a verification code to <strong className="text-foreground">{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Phase 1 UI Notice:</strong> Enter any 6-digit combination (e.g. 123456) to test client validation and transition to password reset.
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
                  className="w-11 h-12 text-center text-lg font-bold rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              ))}
            </div>

            <Button type="submit" disabled={isVerifying} className="w-full rounded-lg font-semibold shadow-md">
              {isVerifying ? 'Verifying Code...' : 'Verify & Continue'}
            </Button>
          </form>

          {/* Resend Code & Countdown */}
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            {countdown > 0 ? (
              <p>
                Resend code in <strong className="text-primary font-bold">{countdown}s</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Resend 6-Digit Code
              </button>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
