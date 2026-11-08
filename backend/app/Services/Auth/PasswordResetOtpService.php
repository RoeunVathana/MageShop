<?php

namespace App\Services\Auth;

use App\Models\PasswordResetOtp;
use App\Models\User;
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

        if (!$user) {
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

        // Queue/dispatch recovery email (logged in development)
        try {
            Mail::raw("Your MegaCommerce password recovery verification code is: {$rawOtp}\n\nThis code expires in 5 minutes. If you did not request this, please secure your account immediately.", function ($m) use ($email) {
                $m->to($email)->subject('MegaCommerce — Password Recovery Verification Code');
            });
        } catch (\Throwable $e) {
            Log::warning("Failed to dispatch OTP email to [{$email}]: {$e->getMessage()}");
        }

        return true;
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

        if (!$record) {
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

        if (!Hash::check($otp, $record->otp_hash)) {
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

        if (!$record || $record->reset_token_expires_at === null || $record->reset_token_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired password reset authorization token.'],
            ]);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
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

