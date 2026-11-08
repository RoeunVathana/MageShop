<?php

namespace App\Services\Telegram;

use App\Models\Role;
use App\Models\TelegramAccount;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class TelegramAuthService
{
    protected string $botToken;

    public function __construct()
    {
        $this->botToken = (string) Config::get('telegram.bot_token', '');
    }

    /**
     * Validate raw initData string from Telegram Mini App.
     *
     * @param  string  $initData  Raw query string
     * @param  int  $maxAgeSeconds  Maximum age in seconds (default 86400 = 24h)
     * @return array Parsed validated parameters
     *
     * @throws ValidationException
     */
    public function validateInitData(string $initData, int $maxAgeSeconds = 86400): array
    {
        if (empty($initData)) {
            throw ValidationException::withMessages([
                'init_data' => ['Empty Telegram initData provided.'],
            ]);
        }

        parse_str($initData, $params);

        if (! isset($params['hash'])) {
            throw ValidationException::withMessages([
                'init_data' => ['Missing hash in Telegram initData.'],
            ]);
        }

        $receivedHash = (string) $params['hash'];
        unset($params['hash']);

        // Check auth_date for replay attack prevention
        if (! isset($params['auth_date']) || ! is_numeric($params['auth_date'])) {
            throw ValidationException::withMessages([
                'init_data' => ['Missing or invalid auth_date in Telegram initData.'],
            ]);
        }

        $authDate = (int) $params['auth_date'];
        $currentTime = time();
        if (abs($currentTime - $authDate) > $maxAgeSeconds) {
            throw ValidationException::withMessages([
                'init_data' => ['Telegram initData timestamp has expired or is outside valid window.'],
            ]);
        }

        // Build data_check_string: alphabetical sort of key=value pairs joined with newline
        ksort($params);
        $checkPairs = [];
        foreach ($params as $key => $val) {
            $checkPairs[] = "{$key}={$val}";
        }
        $dataCheckString = implode("\n", $checkPairs);

        // Telegram secret key = HMAC_SHA256("WebAppData", bot_token)
        $secretKey = hash_hmac('sha256', $this->botToken, 'WebAppData', true);
        $expectedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (! hash_equals($expectedHash, $receivedHash)) {
            Log::warning('Telegram initData signature verification failed', [
                'expected_hash' => $expectedHash,
                'received_hash' => $receivedHash,
            ]);

            throw ValidationException::withMessages([
                'init_data' => ['Invalid Telegram signature. Verification failed.'],
            ]);
        }

        return $params;
    }

    /**
     * Authenticate or register a customer using validated Telegram data.
     */
    public function authenticateTelegramUser(array $validatedData, ?User $currentUser = null): array
    {
        if (! isset($validatedData['user'])) {
            throw ValidationException::withMessages([
                'init_data' => ['No user payload found in Telegram initData.'],
            ]);
        }

        $telegramUserData = is_array($validatedData['user'])
            ? $validatedData['user']
            : json_decode($validatedData['user'], true);

        if (! isset($telegramUserData['id'])) {
            throw ValidationException::withMessages([
                'init_data' => ['Telegram user ID is missing.'],
            ]);
        }

        $telegramId = (int) $telegramUserData['id'];
        $username = $telegramUserData['username'] ?? null;
        $firstName = $telegramUserData['first_name'] ?? 'Telegram';
        $lastName = $telegramUserData['last_name'] ?? 'User';
        $photoUrl = $telegramUserData['photo_url'] ?? null;
        $langCode = $telegramUserData['language_code'] ?? 'en';

        $adminChatId = (int) Config::get('telegram.admin_chat_id', 0);
        $isConfiguredAdmin = ($adminChatId > 0 && $adminChatId === $telegramId);

        return DB::transaction(function () use (
            $currentUser,
            $telegramId,
            $username,
            $firstName,
            $lastName,
            $photoUrl,
            $langCode,
            $isConfiguredAdmin
        ) {
            $telegramAccount = TelegramAccount::where('telegram_user_id', $telegramId)->first();

            $user = null;
            if ($currentUser) {
                $user = $currentUser;
            } elseif ($telegramAccount && $telegramAccount->user_id) {
                $user = $telegramAccount->user;
            }

            if (! $user) {
                // Synthesize email or find existing by synthetic email
                $syntheticEmail = "tg_{$telegramId}@megacommerce.internal";
                $fullName = trim("{$firstName} {$lastName}");

                $user = User::firstOrCreate(
                    ['email' => $syntheticEmail],
                    [
                        'name' => $fullName ?: "Telegram User {$telegramId}",
                        'status' => 'active',
                        'password' => bin2hex(random_bytes(24)),
                        'email_verified_at' => now(),
                    ]
                );

                // Ensure customer role
                if ($user->roles()->count() === 0) {
                    $customerRole = Role::firstOrCreate(
                        ['slug' => 'customer'],
                        ['name' => 'CUSTOMER', 'description' => 'Regular customer']
                    );
                    $user->roles()->attach($customerRole->id);
                }
            }

            $isAdmin = $isConfiguredAdmin || $user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('STAFF');

            if (! $telegramAccount) {
                $telegramAccount = TelegramAccount::create([
                    'user_id' => $user->id,
                    'telegram_user_id' => $telegramId,
                    'telegram_username' => $username,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'photo_url' => $photoUrl,
                    'language_code' => $langCode,
                    'is_bot_admin' => $isAdmin,
                    'linked_at' => now(),
                ]);
            } else {
                $telegramAccount->update([
                    'user_id' => $user->id,
                    'telegram_username' => $username,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'photo_url' => $photoUrl ?: $telegramAccount->photo_url,
                    'language_code' => $langCode,
                    'is_bot_admin' => $isAdmin,
                ]);
            }

            // Issue Sanctum token for Mini App API calls
            $token = $user->createToken('telegram-mini-app', ['*'])->plainTextToken;

            return [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('slug')->toArray(),
                ],
                'telegram' => [
                    'id' => $telegramAccount->id,
                    'telegram_user_id' => $telegramAccount->telegram_user_id,
                    'username' => $telegramAccount->telegram_username,
                    'first_name' => $telegramAccount->first_name,
                    'last_name' => $telegramAccount->last_name,
                    'photo_url' => $telegramAccount->photo_url,
                    'language_code' => $telegramAccount->language_code,
                    'is_bot_admin' => $telegramAccount->is_bot_admin,
                ],
            ];
        });
    }
}
