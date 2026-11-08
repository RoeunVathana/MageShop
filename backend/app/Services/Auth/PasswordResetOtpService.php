<?php

namespace App\Services\Auth;

use App\Models\PasswordResetOtp;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Telegram\TelegramService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetOtpService
{
    /**
     * Generate and dispatch a 6-digit OTP for password recovery.
     * Prevents account enumeration by returning true regardless of user existence.
     */
    public function sendOtp(string $email): bool
    {
        $email = strtolower(trim($email));
        $user = User::where('email', $email)->first();

        // Check active cooldown on existing OTP for this email
        $latest = PasswordResetOtp::where('email', $email)
            ->where('is_used', false)
            ->latest()
            ->first();

        if ($latest && $latest->isCoolingDown()) {
            throw ValidationException::withMessages([
                'email' => ['Please wait 60 seconds before requesting another recovery code.'],
            ]);
        }

        if (! $user) {
            // Return true to avoid account enumeration
            return true;
        }

        // Invalidate any previously unverified active codes for this email
        PasswordResetOtp::where('email', $email)
            ->where('is_used', false)
            ->update(['is_used' => true]);

        // Cryptographically secure 6-digit OTP
        $rawOtp = (string) random_int(100000, 999999);
        $otpHash = Hash::make($rawOtp);

        PasswordResetOtp::create([
            'email' => $email,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'cooldown_until' => now()->addSeconds(60),
            'is_used' => false,
        ]);

        // Apply dynamic SMTP settings from StoreSetting (configured in /admin/security) if present
        $this->applyDynamicMailSettings();

        // Queue/dispatch recovery email
        try {
            Mail::raw("Your TYUSHOP password recovery verification code is: {$rawOtp}\n\nThis 6-digit OTP code expires in 5 minutes. Enter it on the Verify OTP screen to reset your password.\n\nIf you did not request this, please ignore this message.", function ($m) use ($email) {
                $m->to($email)->subject('TYUSHOP — 6-Digit Password Recovery OTP Code');
            });
        } catch (\Throwable $e) {
            Log::warning("Failed to dispatch OTP email to [{$email}]: {$e->getMessage()}");
        }

        // Also dispatch via Telegram Bot if user has a linked Telegram account
        try {
            $telegramAccount = $user->telegramAccount;
            if ($telegramAccount && ! empty($telegramAccount->telegram_chat_id)) {
                app(TelegramService::class)->sendMessage(
                    $telegramAccount->telegram_chat_id,
                    "🔐 *TYUSHOP Password Recovery OTP*\n\nYour 6-digit verification code is: *{$rawOtp}*\nExpires in 5 minutes.",
                    ['parse_mode' => 'Markdown']
                );
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to dispatch Telegram OTP for [{$email}]: {$e->getMessage()}");
        }

        return true;
    }

    /**
     * Apply dynamic SMTP settings stored in `store_settings` table by Admin Security Console.
     */
    protected function applyDynamicMailSettings(): void
    {
        try {
            $host = StoreSetting::get('mail_host');
            if (! empty($host)) {
                Config::set('mail.default', StoreSetting::get('mail_mailer', config('mail.default', 'smtp')));
                Config::set('mail.mailers.smtp.host', $host);
                Config::set('mail.mailers.smtp.port', (int) StoreSetting::get('mail_port', 587));
                Config::set('mail.mailers.smtp.username', StoreSetting::get('mail_username'));
                $password = StoreSetting::get('mail_password');
                if (! empty($password)) {
                    Config::set('mail.mailers.smtp.password', $password);
                }
                $encryption = StoreSetting::get('mail_encryption');
                if ($encryption !== null) {
                    Config::set('mail.mailers.smtp.encryption', $encryption === '' ? null : $encryption);
                }
                $fromAddress = StoreSetting::get('mail_from_address');
                if (! empty($fromAddress)) {
                    Config::set('mail.from.address', $fromAddress);
                }
                $fromName = StoreSetting::get('mail_from_name');
                if (! empty($fromName)) {
                    Config::set('mail.from.name', $fromName);
                }
            }
        } catch (\Throwable $e) {
            // Ignore if store_settings table is not yet migrated
        }
    }

    /**
     * Verify the 6-digit OTP and issue a single-use password reset authorization token.
     */
    public function verifyOtp(string $email, string $otp): string
    {
        $email = strtolower(trim($email));
        $record = PasswordResetOtp::where('email', $email)
            ->where('is_used', false)
            ->latest()
            ->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'otp' => ['No active password recovery request found for this email.'],
            ]);
        }

        if ($record->isExpired()) {
            $record->update(['is_used' => true]);
            throw ValidationException::withMessages([
                'otp' => ['Verification code has expired. Please request a new code.'],
            ]);
        }

        if ($record->attempts >= 5) {
            $record->update(['is_used' => true]);
            throw ValidationException::withMessages([
                'otp' => ['Maximum incorrect attempts exceeded. This code has been invalidated for security.'],
            ]);
        }

        if (! Hash::check($otp, $record->otp_hash)) {
            $record->increment('attempts');
            $remaining = 5 - $record->attempts;
            throw ValidationException::withMessages([
                'otp' => ["Invalid verification code. {$remaining} attempts remaining."],
            ]);
        }

        // Generate short-lived single-use reset authorization token (valid 15 minutes)
        $resetToken = Str::random(64);
        $record->update([
            'reset_token' => $resetToken,
            'reset_token_expires_at' => now()->addMinutes(15),
        ]);

        return $resetToken;
    }

    /**
     * Complete password reset using valid reset token.
     */
    public function resetPassword(string $email, string $resetToken, string $newPassword): bool
    {
        $email = strtolower(trim($email));
        $record = PasswordResetOtp::where('email', $email)
            ->where('reset_token', $resetToken)
            ->where('is_used', false)
            ->first();

        if (! $record || $record->reset_token_expires_at === null || $record->reset_token_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired password reset authorization token.'],
            ]);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['User not found.'],
            ]);
        }

        // Update password using Eloquent (casted to hashed with Argon2id)
        $user->password = $newPassword;
        $user->save();

        // Invalidate reset token and OTP
        $record->update([
            'is_used' => true,
            'reset_token' => null,
        ]);

        // Revoke all existing Sanctum tokens for security
        $user->tokens()->delete();

        return true;
    }
}
