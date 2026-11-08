<?php

namespace Tests\Feature;

use App\Models\TelegramAccount;
use App\Services\Telegram\TelegramAiService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramAiServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_ai_searches_catalog_products_with_real_stock(): void
    {
        $account = TelegramAccount::firstOrCreate(
            ['telegram_user_id' => 1234599],
            ['first_name' => 'Shopper', 'language_code' => 'en']
        );

        $aiService = app(TelegramAiService::class);
        $result = $aiService->chat($account, 'Do you have MacBook Pro?');

        $this->assertNotEmpty($result['message']);
        $this->assertStringContainsString('MacBook', $result['message']);
        $this->assertNotEmpty($result['tool_calls']);
        $this->assertEquals('searchProducts', $result['tool_calls'][0]['tool']);
    }

    public function test_ai_checks_store_policies_in_khmer(): void
    {
        $account = TelegramAccount::firstOrCreate(
            ['telegram_user_id' => 1234599],
            ['first_name' => 'Shopper', 'language_code' => 'km']
        );

        $aiService = app(TelegramAiService::class);
        $result = $aiService->chat($account, 'តើមានគោលការណ៍ប្តូរទំនិញវិញទេ?', null, 'km');

        $this->assertNotEmpty($result['message']);
        $this->assertNotEmpty($result['tool_calls']);
        $this->assertEquals('getStorePolicies', $result['tool_calls'][0]['tool']);
    }

    public function test_ai_tracks_order_number(): void
    {
        $account = TelegramAccount::firstOrCreate(
            ['telegram_user_id' => 1234599],
            ['first_name' => 'Shopper', 'language_code' => 'en']
        );

        $aiService = app(TelegramAiService::class);
        $result = $aiService->chat($account, 'Where is my order ORD-2026-9041?');

        $this->assertNotEmpty($result['message']);
        $this->assertStringContainsString('ORD-2026-9041', $result['message']);
        $this->assertEquals('getDeliveryStatus', $result['tool_calls'][0]['tool']);
    }
}
