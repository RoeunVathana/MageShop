<?php

return [
    'api_url' => env('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh'),
    'api_token' => env('BAKONG_API_TOKEN'),
    'enabled' => filter_var(env('BAKONG_API_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
    'account_id' => env('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt'),
    'merchant_name' => env('BAKONG_MERCHANT_NAME', 'TYUSHOP'),
    'merchant_name_km' => env('BAKONG_MERCHANT_NAME_KM', 'TYUSHOP'),
    'merchant_city' => env('BAKONG_MERCHANT_CITY', 'Phnom Penh'),
    'merchant_phone' => env('MERCHANT_PHONE', '855976554143'),
    'merchant_display_name' => env('MERCHANT_NAME', 'Real Money'),
    'merchant_display_city' => env('MERCHANT_CITY', 'Phnom Penh'),
    'store_label' => env('STORE_LABEL', 'POS Store'),
    'qr_expires_minutes' => (int) env('PAYMENT_QR_EXPIRES_MINUTES', 10),
    'registration' => [
        'required' => filter_var(env('REGISTRATION_PAYMENT_REQUIRED', false), FILTER_VALIDATE_BOOLEAN),
        'fee' => (float) env('REGISTRATION_FEE', 1.00),
        'currency' => env('REGISTRATION_CURRENCY', 'USD'),
    ],
    'password_reset_otp_expires_minutes' => (int) env('PASSWORD_RESET_OTP_EXPIRES_MINUTES', 10),
];
