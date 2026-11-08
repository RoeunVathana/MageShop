<?php

return [
    'api_url' => env('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh'),
    'api_token' => env('BAKONG_API_TOKEN'),
    'enabled' => filter_var(env('BAKONG_API_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
    'account_id' => env('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt'),
    'merchant_name' => env('BAKONG_MERCHANT_NAME', 'CampusFlow'),
    'merchant_name_km' => env('BAKONG_MERCHANT_NAME_KM', 'CampusFlow'),
    'merchant_city' => env('BAKONG_MERCHANT_CITY', 'Phnom Penh'),
    'merchant_phone' => env('MERCHANT_PHONE', '855976554143'),
    'qr_expires_minutes' => (int) env('PAYMENT_QR_EXPIRES_MINUTES', 10),
];

