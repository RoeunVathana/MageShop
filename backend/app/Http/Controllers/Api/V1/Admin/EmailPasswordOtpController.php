<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetOtp;
use App\Models\Role;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Auth\PasswordResetOtpService;
use App\Services\Security\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
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
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated. Administrator credentials and security privileges required.');
        }

        if (! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
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
     * Store new user / member directly by Administrator.
     */
    public function storeUser(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone_number' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => ['nullable', 'string', 'in:active,inactive,pending,suspended'],
            'role' => ['nullable', 'string'],
        ]);

        $user = User::create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'phone_number' => $validated['phone_number'] ?? null,
            'password' => Hash::make($validated['password'] ?? 'Tyushop@2026!'),
            'status' => $validated['status'] ?? 'active',
            'email_verified_at' => now(),
        ]);

        if (!empty($validated['role'])) {
            $role = Role::where('slug', $validated['role'])->orWhere('name', $validated['role'])->first();
            if ($role) {
                $user->roles()->syncWithoutDetaching([$role->id]);
            }
        }

        $actorId = $request->user() ? $request->user()->id : $user->id;
        SecurityLogService::log('ADMIN_USER_CREATED', $actorId, [
            'created_user_id' => $user->id,
            'email' => $user->email,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Member {$user->name} created successfully.",
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'status' => $user->status,
                'created_at' => $user->created_at->toIso8601String(),
                'roles' => $user->roles->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),
            ],
        ], 201);
    }

    /**
     * Delete user by Administrator.
     */
    public function deleteUser(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $currentUserId = $request->user() ? $request->user()->id : null;
        if ($currentUserId && $user->id === $currentUserId) {
            return response()->json([
                'status' => 'error',
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $userId = $user->id;
        $userName = $user->name;
        $user->roles()->detach();
        $user->delete();

        SecurityLogService::log('ADMIN_USER_DELETED', $currentUserId ?? 1, [
            'deleted_user_id' => $userId,
            'name' => $userName,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "User {$userName} has been removed.",
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
                'mail_from_name' => StoreSetting::get('mail_from_name', config('mail.from.name', 'TYUSHOP')),
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
            Mail::raw("TYUSHOP SMTP Live Verification Test\n\nYour test OTP verification code is: {$testOtp}\n\nTimestamp: ".now()->toIso8601String()."\n\nIf you received this message, your mail configuration is operational.", function ($m) use ($testEmail) {
                $m->to($testEmail)->subject('TYUSHOP — SMTP & OTP Delivery Test');
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

    /**
     * Get Telegram Bot API Token Key & Webhook configuration.
     */
    public function getTelegramSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $rawToken = (string) StoreSetting::get('telegram_bot_token', config('telegram.bot_token', ''));
        $maskedToken = '';
        if (strlen($rawToken) > 12) {
            $maskedToken = substr($rawToken, 0, 9).'...'.substr($rawToken, -5);
        } elseif (! empty($rawToken)) {
            $maskedToken = '********';
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'telegram_bot_token_set' => ! empty($rawToken),
                'telegram_bot_token_masked' => $maskedToken,
                'telegram_bot_username' => (string) StoreSetting::get('telegram_bot_username', config('telegram.bot_username', 'TyuShopBot')),
                'telegram_admin_chat_id' => (string) StoreSetting::get('telegram_admin_chat_id', config('telegram.admin_chat_id', '')),
                'telegram_webhook_secret' => (string) StoreSetting::get('telegram_webhook_secret', config('telegram.webhook_secret', 'tyushop_sec_token_99182a')),
                'telegram_mini_app_url' => (string) StoreSetting::get('telegram_mini_app_url', config('telegram.mini_app_url', 'https://tyushop.blog/telegram-app')),
                'telegram_webhook_url' => (string) StoreSetting::get('telegram_webhook_url', rtrim(config('app.url', 'https://mageshop-production.up.railway.app'), '/').'/api/v1/telegram/webhook'),
            ],
        ]);
    }

    /**
     * Update Telegram Bot API Token Key & Webhook configuration.
     */
    public function updateTelegramSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'telegram_bot_token' => ['nullable', 'string', 'max:255'],
            'telegram_bot_username' => ['nullable', 'string', 'max:100'],
            'telegram_admin_chat_id' => ['nullable', 'string', 'max:100'],
            'telegram_webhook_secret' => ['nullable', 'string', 'max:255'],
            'telegram_mini_app_url' => ['nullable', 'url', 'max:255'],
            'telegram_webhook_url' => ['nullable', 'url', 'max:255'],
            'register_webhook' => ['nullable', 'boolean'],
        ]);

        foreach (['telegram_bot_token', 'telegram_bot_username', 'telegram_admin_chat_id', 'telegram_webhook_secret', 'telegram_mini_app_url', 'telegram_webhook_url'] as $key) {
            if (array_key_exists($key, $validated) && $validated[$key] !== null && $validated[$key] !== '') {
                StoreSetting::set($key, trim((string) $validated[$key]));
            }
        }

        $activeToken = (string) StoreSetting::get('telegram_bot_token', config('telegram.bot_token', ''));
        $webhookUrl = (string) StoreSetting::get('telegram_webhook_url', rtrim(config('app.url', 'https://mageshop-production.up.railway.app'), '/').'/api/v1/telegram/webhook');
        $webhookSecret = (string) StoreSetting::get('telegram_webhook_secret', config('telegram.webhook_secret', ''));

        Config::set('telegram.bot_token', $activeToken);
        Config::set('telegram.webhook_secret', $webhookSecret);

        $webhookStatus = null;
        if (! empty($validated['register_webhook']) && ! empty($activeToken) && ! empty($webhookUrl)) {
            try {
                $resp = Http::timeout(8)->post("https://api.telegram.org/bot{$activeToken}/setWebhook", [
                    'url' => $webhookUrl,
                    'secret_token' => $webhookSecret,
                ]);
                $webhookStatus = $resp->json('description', $resp->successful() ? 'Webhook registered' : 'Webhook registration failed');
            } catch (\Throwable $e) {
                $webhookStatus = 'Webhook request error: '.$e->getMessage();
            }
        }

        SecurityLogService::log('ADMIN_UPDATED_TELEGRAM_SETTINGS', $request->user()->id, [
            'bot_username' => StoreSetting::get('telegram_bot_username'),
            'webhook_status' => $webhookStatus,
        ]);

        $maskedToken = strlen($activeToken) > 12 ? substr($activeToken, 0, 9).'...'.substr($activeToken, -5) : (! empty($activeToken) ? '********' : '');

        return response()->json([
            'status' => 'success',
            'message' => $webhookStatus ? "Telegram API Token saved ({$webhookStatus})." : 'Telegram API Token & Bot configuration saved successfully.',
            'data' => [
                'telegram_bot_token_set' => ! empty($activeToken),
                'telegram_bot_token_masked' => $maskedToken,
                'telegram_bot_username' => (string) StoreSetting::get('telegram_bot_username', 'TyuShopBot'),
                'telegram_admin_chat_id' => (string) StoreSetting::get('telegram_admin_chat_id', ''),
                'telegram_webhook_secret' => $webhookSecret,
                'telegram_mini_app_url' => (string) StoreSetting::get('telegram_mini_app_url', 'https://tyushop.blog/telegram-app'),
                'telegram_webhook_url' => $webhookUrl,
                'webhook_status' => $webhookStatus,
            ],
        ]);
    }

    /**
     * Test Telegram Bot API Token Key & send a live 6-digit OTP / test message to a Telegram Chat ID.
     */
    public function testTelegramBotConnection(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'chat_id' => ['nullable', 'string', 'max:100'],
        ]);

        $activeToken = (string) StoreSetting::get('telegram_bot_token', config('telegram.bot_token', ''));
        if (empty($activeToken)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Telegram Bot API Token Key is not configured yet. Please enter and save your Bot Token from @BotFather first.',
            ], 422);
        }

        $targetChatId = ! empty($validated['chat_id'])
            ? trim($validated['chat_id'])
            : (string) StoreSetting::get('telegram_admin_chat_id', config('telegram.admin_chat_id', ''));

        try {
            $meResp = Http::timeout(8)->get("https://api.telegram.org/bot{$activeToken}/getMe");
            if (! $meResp->successful() || ! $meResp->json('ok')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Telegram API rejected token: '.($meResp->json('description') ?? 'Invalid Bot Token'),
                ], 422);
            }

            $botInfo = $meResp->json('result', []);
            $botUsername = $botInfo['username'] ?? 'UnknownBot';
            $botName = $botInfo['first_name'] ?? 'TYUSHOP Bot';

            $messageSent = false;
            if (! empty($targetChatId)) {
                $testOtp = (string) random_int(100000, 999999);
                $msgResp = Http::timeout(8)->post("https://api.telegram.org/bot{$activeToken}/sendMessage", [
                    'chat_id' => $targetChatId,
                    'parse_mode' => 'Markdown',
                    'text' => "✅ *TYUSHOP Telegram API Token Verified!*\n\nBot: *@{$botUsername}* ({$botName})\nSample 6-Digit OTP: *{$testOtp}*\nTime: ".now()->toIso8601String(),
                ]);
                $messageSent = $msgResp->successful() && $msgResp->json('ok');
            }

            return response()->json([
                'status' => 'success',
                'message' => $messageSent
                    ? "Connected to @{$botUsername} ({$botName}) & sent live test OTP message to Chat ID {$targetChatId}!"
                    : "Telegram API Token verified! Connected to @{$botUsername} ({$botName}).",
                'data' => [
                    'bot_username' => $botUsername,
                    'bot_name' => $botName,
                    'message_sent' => $messageSent,
                    'chat_id' => $targetChatId,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Telegram connection test failed: '.$e->getMessage(),
            ], 500);
        }
    }
}
