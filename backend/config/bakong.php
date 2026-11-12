<?php

$bakongEnv = static function (string $key, mixed $default = ''): string {
    $value = env($key, $default);

    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }

    // Accept values copied from a shell continuation block, such as
    // `BAKONG_API_ENABLED="true"\\`, without persisting the escape character.
    return trim((string) $value, " \t\n\r\0\x0B\"'\\");
};

$bakongApiUrl = str_replace('\\', '', $bakongEnv('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh'));

return [
    'api_url' => $bakongApiUrl,
    'api_token' => $bakongEnv('BAKONG_API_TOKEN'),
    'enabled' => filter_var($bakongEnv('BAKONG_API_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
    'account_id' => $bakongEnv('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt'),
    'merchant_name' => $bakongEnv('BAKONG_MERCHANT_NAME', 'TYUSHOP'),
    'merchant_name_km' => $bakongEnv('BAKONG_MERCHANT_NAME_KM', 'TYUSHOP'),
    'merchant_city' => $bakongEnv('BAKONG_MERCHANT_CITY', 'Phnom Penh'),
    'merchant_phone' => $bakongEnv('MERCHANT_PHONE', '855976554143'),
    'merchant_display_name' => $bakongEnv('MERCHANT_NAME', 'Real Money'),
    'merchant_display_city' => $bakongEnv('MERCHANT_CITY', 'Phnom Penh'),
    'store_label' => $bakongEnv('STORE_LABEL', 'POS Store'),
    'qr_expires_minutes' => (int) $bakongEnv('PAYMENT_QR_EXPIRES_MINUTES', 10),
    'registration' => [
        'required' => filter_var($bakongEnv('REGISTRATION_PAYMENT_REQUIRED', false), FILTER_VALIDATE_BOOLEAN),
        'fee' => (float) $bakongEnv('REGISTRATION_FEE', 1.00),
        'currency' => $bakongEnv('REGISTRATION_CURRENCY', 'USD'),
    ],
    'password_reset_otp_expires_minutes' => (int) $bakongEnv('PASSWORD_RESET_OTP_EXPIRES_MINUTES', 10),
];
