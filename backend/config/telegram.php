<?php

return [
    'bot_token' => env('TELEGRAM_BOT_TOKEN', 'test_bot_token'),
    'bot_username' => env('TELEGRAM_BOT_USERNAME', 'MegaCommerceAiBot'),
    'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', 'megacommerce_sec_token_99182a'),
    'mini_app_url' => env('TELEGRAM_MINI_APP_URL', 'http://localhost:3000/telegram-app'),
    'admin_chat_id' => env('TELEGRAM_ADMIN_CHAT_ID'),
    'api_base_url' => env('TELEGRAM_API_BASE_URL', 'https://api.telegram.org'),

    'ai' => [
        'provider' => env('AI_PROVIDER', 'gemini'),
        'api_key' => env('AI_API_KEY', ''),
        'model' => env('AI_MODEL', 'gemini-1.5-flash'),
        'max_tokens' => 1024,
        'temperature' => 0.2,
    ],
];

