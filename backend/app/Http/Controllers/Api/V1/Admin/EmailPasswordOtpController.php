<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetOtp;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Auth\PasswordResetOtpService;
use App\Services\Security\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class EmailPasswordOtpController extends Controller
{
    /**
     * Authorize administrator access.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Administrator credentials and security privileges required.');
        }
    }

    /**
     * List registered users across all roles with security status.
     */
    public function indexUsers(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = User::with('roles')->latest();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone_number', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $roleSlug = $request->input('role');
            $query->whereHas('roles', function ($rq) use ($roleSlug) {
                $rq->where('slug', $roleSlug);
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $users = $query->paginate($perPage);

        $transformed = collect($users->items())->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone_number' => $u->phone_number,
                'status' => $u->status,
                'is_email_verified' => $u->email_verified_at !== null,
                'email_verified_at' => $u->email_verified_at ? $u->email_verified_at->toIso8601String() : null,
                'created_at' => $u->created_at ? $u->created_at->toIso8601String() : null,
                'roles' => $u->roles->map(fn ($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'slug' => $r->slug,
                ]),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $transformed,
            'meta' => [
                'total' => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
            ],
        ]);
    }

    /**
     * Update user email address directly by Administrator.
     */
    public function updateEmail(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'mark_verified' => ['nullable', 'boolean'],
        ]);

        $oldEmail = $user->email;
        $newEmail = strtolower(trim($validated['email']));

        $user->email = $newEmail;
        if ($validated['mark_verified'] ?? true) {
            $user->email_verified_at = now();
        }
        $user->save();

        SecurityLogService::log('ADMIN_USER_EMAIL_UPDATED', $request->user()->id, [
            'target_user_id' => $user->id,
            'old_email' => $oldEmail,
            'new_email' => $newEmail,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "User email successfully updated to {$newEmail}.",
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->toIso8601String() : null,
            ],
        ]);
    }

    /**
     * Add or update password for a user directly with strong security hashing.
     */
    public function updatePassword(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()],
            'revoke_tokens' => ['nullable', 'boolean'],
        ]);

        // Automatically hashed with Argon2id via cast in User model
        $user->password = $validated['password'];
        $user->save();

        // Optionally revoke existing personal access tokens for immediate security
        if ($validated['revoke_tokens'] ?? true) {
            $user->tokens()->delete();
        }

        SecurityLogService::log('ADMIN_USER_PASSWORD_UPDATED', $request->user()->id, [
            'target_user_id' => $user->id,
            'target_email' => $user->email,
            'revoked_tokens' => $validated['revoke_tokens'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Password for user {$user->name} has been securely updated.",
        ]);
    }

    /**
     * Dispatch 6-digit OTP verification code to a user's registered email.
     */
    public function sendUserOtp(Request $request, User $user, PasswordResetOtpService $otpService): JsonResponse
    {
        $this->authorizeAdmin($request);

        $otpService->sendOtp($user->email);

        SecurityLogService::log('ADMIN_DISPATCHED_USER_OTP', $request->user()->id, [
            'target_user_id' => $user->id,
            'target_email' => $user->email,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "6-digit OTP code has been dispatched to {$user->email}.",
        ]);
    }

    /**
     * List all dispatched OTP records and their real-time verification status.
     */
    public function indexOtps(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = PasswordResetOtp::latest();

        if ($request->filled('email')) {
            $query->where('email', 'ilike', '%'.trim($request->input('email')).'%');
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'active') {
                $query->where('is_used', false)->where('expires_at', '>', now());
            } elseif ($status === 'used') {
                $query->where('is_used', true);
            } elseif ($status === 'expired') {
                $query->where('is_used', false)->where('expires_at', '<=', now());
            }
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $otps = $query->paginate($perPage);

        $transformed = collect($otps->items())->map(function ($otp) {
            $isExpired = $otp->expires_at->isPast();
            $statusLabel = $otp->is_used ? 'used' : ($isExpired ? 'expired' : 'active');

            return [
                'id' => $otp->id,
                'email' => $otp->email,
                'attempts' => $otp->attempts,
                'is_used' => $otp->is_used,
                'is_expired' => $isExpired,
                'status' => $statusLabel,
                'expires_at' => $otp->expires_at->toIso8601String(),
                'cooldown_until' => $otp->cooldown_until ? $otp->cooldown_until->toIso8601String() : null,
                'is_cooling_down' => $otp->isCoolingDown(),
                'created_at' => $otp->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $transformed,
            'meta' => [
                'total' => $otps->total(),
                'current_page' => $otps->currentPage(),
                'last_page' => $otps->lastPage(),
                'per_page' => $otps->perPage(),
            ],
        ]);
    }

    /**
     * Dispatch OTP to any specified email directly from Admin Console.
     */
    public function dispatchOtp(Request $request, PasswordResetOtpService $otpService): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $otpService->sendOtp($validated['email']);

        SecurityLogService::log('ADMIN_DIRECT_DISPATCH_OTP', $request->user()->id, [
            'email' => $validated['email'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "OTP code dispatched successfully to {$validated['email']}.",
        ]);
    }

    /**
     * Invalidate an active OTP record immediately.
     */
    public function invalidateOtp(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $otp = PasswordResetOtp::findOrFail($id);
        $otp->update(['is_used' => true]);

        SecurityLogService::log('ADMIN_INVALIDATED_OTP', $request->user()->id, [
            'otp_id' => $id,
            'email' => $otp->email,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "OTP for {$otp->email} has been invalidated.",
        ]);
    }

    /**
     * Resend an OTP code to the recipient email.
     */
    public function resendOtp(Request $request, int $id, PasswordResetOtpService $otpService): JsonResponse
    {
        $this->authorizeAdmin($request);

        $otp = PasswordResetOtp::findOrFail($id);
        $otpService->sendOtp($otp->email);

        SecurityLogService::log('ADMIN_RESENT_OTP', $request->user()->id, [
            'otp_id' => $id,
            'email' => $otp->email,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "New OTP verification code sent to {$otp->email}.",
        ]);
    }

    /**
     * Get email and SMTP configuration for administration.
     */
    public function getEmailSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'status' => 'success',
            'data' => [
                'mail_mailer' => StoreSetting::get('mail_mailer', config('mail.default', 'smtp')),
                'mail_host' => StoreSetting::get('mail_host', config('mail.mailers.smtp.host', 'smtp.resend.com')),
                'mail_port' => (int) StoreSetting::get('mail_port', config('mail.mailers.smtp.port', 587)),
                'mail_username' => StoreSetting::get('mail_username', config('mail.mailers.smtp.username', 'resend')),
                'mail_password_set' => ! empty(StoreSetting::get('mail_password', config('mail.mailers.smtp.password'))),
                'mail_encryption' => StoreSetting::get('mail_encryption', config('mail.mailers.smtp.encryption', 'tls')),
                'mail_from_address' => StoreSetting::get('mail_from_address', config('mail.from.address', 'noreply@tyushop.blog')),
                'mail_from_name' => StoreSetting::get('mail_from_name', config('mail.from.name', 'MegaCommerce')),
            ],
        ]);
    }

    /**
     * Update email and SMTP configuration.
     */
    public function updateEmailSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'mail_mailer' => ['nullable', 'string', 'in:smtp,sendmail,mailgun,ses,postmark,resend,log'],
            'mail_host' => ['nullable', 'string', 'max:255'],
            'mail_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'mail_username' => ['nullable', 'string', 'max:255'],
            'mail_password' => ['nullable', 'string', 'max:255'],
            'mail_encryption' => ['nullable', 'string', 'in:tls,ssl,null,none'],
            'mail_from_address' => ['nullable', 'email', 'max:255'],
            'mail_from_name' => ['nullable', 'string', 'max:100'],
        ]);

        foreach ($validated as $key => $val) {
            if ($val !== null) {
                // If mail_encryption is 'none' or 'null', store null string
                if ($key === 'mail_encryption' && ($val === 'none' || $val === 'null')) {
                    $val = '';
                }
                StoreSetting::set($key, (string) $val);
            }
        }

        SecurityLogService::log('ADMIN_UPDATED_EMAIL_SETTINGS', $request->user()->id, [
            'mail_host' => $validated['mail_host'] ?? null,
            'mail_from_address' => $validated['mail_from_address'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Email and SMTP configuration updated successfully.',
            'data' => [
                'mail_mailer' => StoreSetting::get('mail_mailer'),
                'mail_host' => StoreSetting::get('mail_host'),
                'mail_port' => (int) StoreSetting::get('mail_port', 587),
                'mail_username' => StoreSetting::get('mail_username'),
                'mail_password_set' => ! empty(StoreSetting::get('mail_password')),
                'mail_encryption' => StoreSetting::get('mail_encryption'),
                'mail_from_address' => StoreSetting::get('mail_from_address'),
                'mail_from_name' => StoreSetting::get('mail_from_name'),
            ],
        ]);
    }

    /**
     * Send live test OTP email to verify SMTP deliverability.
     */
    public function sendTestEmailOtp(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'test_email' => ['required', 'email'],
        ]);

        $testEmail = $validated['test_email'];
        $testOtp = (string) random_int(100000, 999999);

        try {
            Mail::raw("MegaCommerce SMTP Live Verification Test\n\nYour test OTP verification code is: {$testOtp}\n\nTimestamp: ".now()->toIso8601String()."\n\nIf you received this message, your mail configuration is operational.", function ($m) use ($testEmail) {
                $m->to($testEmail)->subject('MegaCommerce — SMTP & OTP Delivery Test');
            });

            SecurityLogService::log('ADMIN_TEST_OTP_EMAIL_SENT', $request->user()->id, [
                'test_email' => $testEmail,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Test OTP email successfully sent to {$testEmail}.",
                'data' => [
                    'recipient' => $testEmail,
                    'timestamp' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $e) {
            SecurityLogService::log('ADMIN_TEST_OTP_EMAIL_FAILED', $request->user()->id, [
                'test_email' => $testEmail,
                'error' => $e->getMessage(),
            ], 'warning');

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send test email: '.$e->getMessage(),
            ], 500);
        }
    }
}
