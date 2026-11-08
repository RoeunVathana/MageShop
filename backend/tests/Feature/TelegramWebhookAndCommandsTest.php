<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\TelegramAccount;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class TelegramWebhookAndCommandsTest extends TestCase
{
    use RefreshDatabase;

    protected string $secret = 'test_webhook_secret_9988';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Config::set('telegram.webhook_secret', $this->secret);
        Config::set('telegram.admin_chat_id', 7770001);
    }

    public function test_rejects_webhook_with_invalid_secret_header(): void
    {
        $response = $this->postJson('/api/v1/telegram/webhook', [
            'update_id' => 101,
            'message' => ['text' => '/start'],
        ], [
            'X-Telegram-Bot-Api-Secret-Token' => 'wrong_secret',
        ]);

        $response->assertStatus(403);
    }

    public function test_accepts_webhook_and_executes_start_command(): void
    {
        $response = $this->postJson('/api/v1/telegram/webhook', [
            'update_id' => rand(100000, 999999),
            'message' => [
                'chat' => ['id' => 123456],
                'from' => [
                    'id' => 123456,
                    'first_name' => 'John',
                    'username' => 'john_doe',
                ],
                'text' => '/start',
            ],
        ], [
            'X-Telegram-Bot-Api-Secret-Token' => $this->secret,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'result' => [
                    'status' => 'command_executed',
                    'command' => '/start',
                ],
            ]);
    }

    public function test_deduplicates_repeated_updates(): void
    {
        $fixedUpdateId = 99887766;

        $payload = [
            'update_id' => $fixedUpdateId,
            'message' => [
                'chat' => ['id' => 123456],
                'from' => ['id' => 123456, 'first_name' => 'Tester'],
                'text' => '/help',
            ],
        ];

        // First call
        $first = $this->postJson('/api/v1/telegram/webhook', $payload, [
            'X-Telegram-Bot-Api-Secret-Token' => $this->secret,
        ]);
        $first->assertStatus(200)->assertJson(['status' => 'ok']);

        // Second call with same update_id
        $second = $this->postJson('/api/v1/telegram/webhook', $payload, [
            'X-Telegram-Bot-Api-Secret-Token' => $this->secret,
        ]);
        $second->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'result' => [
                    'status' => 'ignored_duplicate',
                    'update_id' => $fixedUpdateId,
                ],
            ]);
    }

    public function test_admin_commands_restricted_from_regular_users(): void
    {
        $response = $this->postJson('/api/v1/telegram/webhook', [
            'update_id' => rand(100000, 999999),
            'message' => [
                'chat' => ['id' => 333444],
                'from' => ['id' => 333444, 'first_name' => 'RegularUser'],
                'text' => '/admin',
            ],
        ], [
            'X-Telegram-Bot-Api-Secret-Token' => $this->secret,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'result' => [
                    'status' => 'forbidden',
                    'command' => '/admin',
                ],
            ]);
    }

    public function test_admin_commands_accessible_to_configured_admin(): void
    {
        $response = $this->postJson('/api/v1/telegram/webhook', [
            'update_id' => rand(100000, 999999),
            'message' => [
                'chat' => ['id' => 7770001],
                'from' => ['id' => 7770001, 'first_name' => 'BossAdmin'],
                'text' => '/sales',
            ],
        ], [
            'X-Telegram-Bot-Api-Secret-Token' => $this->secret,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'result' => [
                    'status' => 'admin_command_executed',
                    'command' => '/sales',
                ],
            ]);
    }
}
