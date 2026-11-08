<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SecurityLogService
{
    /**
     * Log a security or authentication event safely.
     * Never passes or records passwords, tokens, OTPs, or financial secrets.
     */
    public static function log(string $action, ?int $userId = null, array $context = [], string $level = 'info'): void
    {
        $sanitizedContext = self::sanitizeContext($context);

        $payload = [
            'event_id' => (string) Str::uuid(),
            'action' => $action,
            'user_id' => $userId,
            'ip_address' => request()->ip() ?? 'CLI',
            'user_agent' => request()->userAgent() ?? 'CLI',
            'timestamp' => now()->toIso8601String(),
            'context' => $sanitizedContext,
        ];

        Log::channel(config('logging.default', 'stack'))->$level(
            "[SECURITY_AUDIT] {$action}",
            $payload
        );
    }

    /**
     * Strip any sensitive parameter keys that could accidentally leak credentials.
     */
    private static function sanitizeContext(array $context): array
    {
        $sensitiveKeys = [
            'password',
            'password_confirmation',
            'token',
            'access_token',
            'refresh_token',
            'otp',
            'code',
            'secret',
            'api_key',
            'card_number',
            'cvv',
        ];

        foreach ($context as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys, true)) {
                $context[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $context[$key] = self::sanitizeContext($value);
            }
        }

        return $context;
    }
}
