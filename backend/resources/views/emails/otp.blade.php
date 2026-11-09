<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TYUSHOP — Password Recovery Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #0f172a;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
        <!-- Top Brand Header -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); padding: 6px 16px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;">
                🔐 Password Recovery • សង្គ្រោះពាក្យសម្ងាត់
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.02em;">TYUSHOP Cambodia</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #c7d2fe;">
                Multi-Vendor Marketplace • ផ្សារទំនើបអនឡាញកម្ពុជា
            </p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 28px;">
            <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Hello,
            </p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                We received a request to reset the password for your TYUSHOP account (<strong>{{ $email }}</strong>).
                Please use the 6-digit verification code below to complete your password reset:
            </p>

            <!-- OTP Code Display Card -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #6366f1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
                    Your 6-Digit OTP Code / លេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់
                </div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 0.25em; color: #4338ca; text-indent: 0.25em;">
                    {{ $rawOtp }}
                </div>
                <div style="margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #dc2626; background: #fee2e2; padding: 4px 12px; border-radius: 999px;">
                    ⏱ Valid for 5 minutes only • មានសុពលភាព ៥ នាទី
                </div>
            </div>

            <!-- Khmer instructions -->
            <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 16px; border-radius: 0 10px 10px 0; margin-bottom: 24px; font-size: 13px; line-height: 1.6; color: #475569;">
                <strong>ការណែនាំ៖</strong> សូមបញ្ចូលលេខកូដ ៦ ខ្ទង់ខាងលើនេះ នៅលើអេក្រង់ <em>Verify OTP</em> ក្នុងគេហទំព័រ TYUSHOP ដើម្បីកំណត់ពាក្យសម្ងាត់ថ្មីរបស់អ្នក។ ប្រសិនបើអ្នកមិនបានស្នើសុំទេ សូមកុំចែករំលែកលេខកូដនេះទៅកាន់នរណាម្នាក់ឡើយ។
            </div>

            <!-- Security Warning -->
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <strong>Security Reminder:</strong> TYUSHOP staff will never ask you for your password or verification code. If you did not request this password reset, your account is still secure and you can safely ignore this email.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0 0 4px 0;">© {{ date('Y') }} TYUSHOP. All rights reserved.</p>
            <p style="margin: 0;">Automated email delivered via Resend • Phnom Penh, Cambodia</p>
        </div>
    </div>
</body>
</html>
