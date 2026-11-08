<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommerceEngagementAndLoyaltyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_security_headers_are_applied_and_malicious_queries_blocked(): void
    {
        $response = $this->getJson('/api/v1/health');
        $response->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

        $wafResponse = $this->getJson('/api/v1/products?search=../../etc/passwd');
        $wafResponse->assertStatus(400)
            ->assertJson(['status' => 'error']);
    }

    public function test_coupon_validation_applies_percentage_and_fixed_discounts(): void
    {
        $res = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'WELCOME10',
            'subtotal' => 100.00,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.discount_amount', 10)
            ->assertJsonPath('data.new_subtotal', 90);

        $khqrRes = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'KHQR5',
            'subtotal' => 25.00,
        ]);

        $khqrRes->assertStatus(200)
            ->assertJsonPath('data.discount_amount', 5)
            ->assertJsonPath('data.new_subtotal', 20);
    }

    public function test_checkout_earns_5_loyalty_points_per_purchase(): void
    {
        $user = User::factory()->create(['loyalty_points' => 10]);
        Sanctum::actingAs($user);

        $product = Product::first();

        $res = $this->postJson('/api/v1/orders/checkout', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'price' => 50.00,
                    'quantity' => 1,
                ],
            ],
            'coupon_code' => 'WELCOME10',
            'customer_name' => 'Dara Sok',
            'customer_phone' => '+855 12 999 888',
            'delivery_address' => 'Street 271, Phnom Penh',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.points_earned', 5)
            ->assertJsonPath('data.new_loyalty_points', 15);

        $this->assertSame(15, (int) $user->fresh()->loyalty_points);
    }

    public function test_redeem_100_points_for_free_product_under_30_dollars(): void
    {
        $user = User::factory()->create(['loyalty_points' => 105]);
        Sanctum::actingAs($user);

        $cheapProduct = Product::where('price', '<=', 30)->first();
        $this->assertNotNull($cheapProduct);

        $res = $this->postJson('/api/v1/loyalty/redeem-free-item', [
            'product_id' => $cheapProduct->id,
            'customer_name' => 'Dara Sok',
            'customer_phone' => '+855 12 999 888',
            'delivery_address' => 'BKK1, Phnom Penh',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.points_redeemed', 100)
            ->assertJsonPath('data.new_loyalty_points', 5)
            ->assertJsonPath('data.order.total_amount', '0.00');

        $this->assertSame(5, (int) $user->fresh()->loyalty_points);

        // Verify expensive product (> $30) is rejected for 100-point free exchange
        $user->update(['loyalty_points' => 200]);
        $expensiveProduct = Product::where('price', '>', 100)->first();

        $rejectRes = $this->postJson('/api/v1/loyalty/redeem-free-item', [
            'product_id' => $expensiveProduct->id,
        ]);

        $rejectRes->assertStatus(422);
    }

    public function test_realtime_delivery_gps_tracking_and_support_endpoints(): void
    {
        $trackRes = $this->getJson('/api/v1/orders/track/ORD-DEMO-123');
        $trackRes->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'order_number',
                    'driver' => ['name', 'phone', 'vehicle'],
                    'gps' => ['current_lat', 'current_lng', 'dest_lat', 'dest_lng', 'estimated_arrival'],
                    'checkpoints',
                ],
            ]);

        $ticketRes = $this->postJson('/api/v1/support/tickets', [
            'name' => 'Sophea Kem',
            'email' => 'sophea@example.com',
            'subject' => 'Question about 100 point reward',
            'category' => 'points',
            'message' => 'How do I redeem my 100 points?',
        ]);
        $ticketRes->assertStatus(201)
            ->assertJsonPath('status', 'ok');

        $chatRes = $this->postJson('/api/v1/support/chat', [
            'message' => 'How many points to get a free item?',
        ]);
        $chatRes->assertStatus(200);
    }
}
