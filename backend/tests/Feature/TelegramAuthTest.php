<?php

namespace Tests\Feature;

use App\Models\TelegramAccount;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class TelegramAuthTest extends TestCase
{
    use RefreshDatabase;

    protected string $botToken = 'test_secret_bot_token_12345';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Config::set('telegram.bot_token', $this->botToken);
    }

    /**
     * Helper to generate signed initData string matching Telegram specification.
     */
    protected function generateInitData(array $userData, int $authDateOffset = 0): string
    {
        $params = [
            'auth_date' => time() + $authDateOffset,
            'query_id' => 'AAHD9988_test',
            'user' => json_encode($userData),
        ];

        ksort($params);
        $pairs = [];
        foreach ($params as $k => $v) {
            $pairs[] = "{$k}={$v}";
        }
        $dataCheckString = implode("\n", $pairs);

        $secretKey = hash_hmac('sha256', $this->botToken, 'WebAppData', true);
        $hash = hash_hmac('sha256', $dataCheckString, $secretKey);

        $params['hash'] = $hash;
        return http_build_query($params);
    }

    public function test_authenticates_valid_telegram_init_data(): void
    {
        $userData = [
            'id' => 991827364,
            'first_name' => 'Dara',
            'last_name' => 'Sok',
            'username' => 'darasok',
            'language_code' => 'km',
        ];

        $initData = $this->generateInitData($userData);

        $response = $this->postJson('/api/v1/telegram/auth', [
            'init_data' => $initData,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'telegram' => [
                        'telegram_user_id' => 991827364,
                        'first_name' => 'Dara',
                        'language_code' => 'km',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('telegram_accounts', [
            'telegram_user_id' => 991827364,
            'telegram_username' => 'darasok',
        ]);

        $this->assertNotNull($response->json('data.token'));
    }

    public function test_rejects_tampered_signature(): void
    {
        $userData = ['id' => 11223344, 'first_name' => 'Hacker'];
        $initData = $this->generateInitData($userData);

        // Tamper with payload
        $tampered = str_replace('11223344', '99999999', $initData);

        $response = $this->postJson('/api/v1/telegram/auth', [
            'init_data' => $tampered,
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    public function test_rejects_expired_auth_date(): void
    {
        $userData = ['id' => 55667788, 'first_name' => 'OldToken'];
        // 48 hours in the past
        $expiredInitData = $this->generateInitData($userData, -172800);

        $response = $this->postJson('/api/v1/telegram/auth', [
            'init_data' => $expiredInitData,
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
            ]);
    }
}
