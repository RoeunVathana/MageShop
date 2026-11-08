<?php

return [
    'bot_token' => env('TELEGRAM_BOT_TOKEN', base64_decode('ODI5NDcyMTYzMDpBQUd2cXJiS0s0bkZhNnNkM0lBV0gxYVJpVFZiTHRwaU5Cdw==')),
    'bot_username' => env('TELEGRAM_BOT_USERNAME', 'MegaCommerceAiBot'),
    'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', 'megacommerce_sec_token_99182a'),
    'mini_app_url' => env('TELEGRAM_MINI_APP_URL', 'https://tyushop.blog/telegram-app'),
    'admin_chat_id' => env('TELEGRAM_ADMIN_CHAT_ID', '5934277627'),
    'api_base_url' => env('TELEGRAM_API_BASE_URL', 'https://api.telegram.org'),

    'ai' => [
        'provider' => env('AI_PROVIDER', 'gemini'),
        'api_key' => env('AI_API_KEY', ''),
        'model' => env('AI_MODEL', 'gemini-1.5-flash'),
        'max_tokens' => 1024,
        'temperature' => 0.2,
    ],
];
