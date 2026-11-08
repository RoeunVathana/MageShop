<?php

namespace Tests\Feature;

use App\Models\Order;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreSettingsAndReceiptTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_public_store_settings_returns_configured_data(): void
    {
        $response = $this->getJson('/api/v1/store-settings');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'store_name' => 'MegaCommerce Flagship Store',
                    'default_currency' => 'USD',
                ],
            ]);
    }

    public function test_order_receipt_json_format(): void
    {
        $order = Order::first();
        $this->assertNotNull($order, 'Seeded order should exist.');

        $response = $this->getJson("/api/v1/orders/{$order->order_number}/receipt?format=json");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'order_number' => $order->order_number,
                ],
            ]);
    }

    public function test_order_receipt_pdf_download(): void
    {
        $order = Order::first();
        $this->assertNotNull($order, 'Seeded order should exist.');

        $response = $this->get("/api/v1/orders/{$order->order_number}/receipt");

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }
}
