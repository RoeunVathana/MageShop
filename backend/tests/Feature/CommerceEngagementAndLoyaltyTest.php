<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\MerchantPaymentAccount;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
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
            ->assertHeader('X-DNS-Prefetch-Control', 'off')
            ->assertHeader('X-Download-Options', 'noopen')
            ->assertHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

        $wafResponse = $this->getJson('/api/v1/products?search=../../etc/passwd');
        $wafResponse->assertStatus(400)
            ->assertJson(['status' => 'error']);

        // Verify offensive scanner User-Agent is blocked with 403
        $scannerResponse = $this->withHeaders(['User-Agent' => 'sqlmap/1.8.2'])->getJson('/api/v1/products');
        $scannerResponse->assertStatus(403);

        // Verify non-media executable file access via media endpoint is blocked with 403
        $mediaExecResponse = $this->getJson('/api/v1/media/index.php');
        $mediaExecResponse->assertStatus(403);
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

    public function test_single_seller_checkout_uses_the_sellers_default_bakong_account(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $seller->assignRole('SELLER');

        $sellerAccount = MerchantPaymentAccount::create([
            'user_id' => $seller->id,
            'account_type' => 'bakong',
            'bank_name' => 'Bakong',
            'account_id' => 'seller@abaa',
            'merchant_name' => 'Seller Store',
            'merchant_city' => 'Phnom Penh',
            'merchant_phone' => '85512000000',
            'currency' => 'USD',
            'is_default' => true,
            'is_active' => true,
        ]);

        $product = Product::firstOrFail();
        $product->update([
            'seller_id' => $seller->id,
            'stock_quantity' => 10,
        ]);

        Sanctum::actingAs($buyer);
        $response = $this->postJson('/api/v1/orders/checkout', [
            'items' => [[
                'product_id' => $product->id,
                'name' => $product->name,
                'price' => 1.00,
                'quantity' => 1,
            ]],
            'payment_method' => 'bakong_khqr',
            'customer_name' => 'Buyer Test',
            'customer_phone' => '+855 12 111 222',
            'delivery_address' => 'Phnom Penh, Cambodia',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.qr_payment.merchant_account', $sellerAccount->account_id)
            ->assertJsonPath('data.qr_payment.merchant_source', 'seller');

        $this->assertSame($sellerAccount->account_id, Payment::latest('id')->value('merchant_account'));
    }

    public function test_seller_checkout_falls_back_to_the_admin_bakong_account_without_seller_configuration(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $seller->assignRole('SELLER');

        $adminAccount = MerchantPaymentAccount::create([
            'user_id' => null,
            'account_type' => 'bakong',
            'bank_name' => 'Bakong',
            'account_id' => 'admin@abaa',
            'merchant_name' => 'Admin Store',
            'merchant_city' => 'Phnom Penh',
            'merchant_phone' => '85512000001',
            'currency' => 'USD',
            'is_default' => true,
            'is_active' => true,
        ]);

        $product = Product::firstOrFail();
        $product->update([
            'seller_id' => $seller->id,
            'stock_quantity' => 10,
        ]);

        Sanctum::actingAs($buyer);
        $response = $this->postJson('/api/v1/orders/checkout', [
            'items' => [[
                'product_id' => $product->id,
                'name' => $product->name,
                'price' => 1.00,
                'quantity' => 1,
            ]],
            'payment_method' => 'bakong_khqr',
            'customer_name' => 'Buyer Test',
            'customer_phone' => '+855 12 111 333',
            'delivery_address' => 'Phnom Penh, Cambodia',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.qr_payment.merchant_account', $adminAccount->account_id)
            ->assertJsonPath('data.qr_payment.merchant_source', 'admin');

        $this->assertSame($adminAccount->account_id, Payment::latest('id')->value('merchant_account'));
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
        $user = User::factory()->create();
        $order = Order::create([
            'order_number' => 'ORD-TEST-123',
            'user_id' => $user->id,
            'status' => 'pending',
            'subtotal' => 10,
            'shipping_fee' => 0,
            'tax' => 0,
            'total_amount' => 10,
            'currency' => 'USD',
            'payment_status' => 'paid',
            'payment_method' => 'bakong_khqr',
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '+855 12 000 000',
            'delivery_address' => 'Phnom Penh, Cambodia',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_name' => 'Test product',
            'product_sku' => 'TEST-001',
            'quantity' => 1,
            'unit_price' => 10,
            'total_price' => 10,
        ]);
        Sanctum::actingAs($user);

        $trackRes = $this->getJson('/api/v1/orders/track/ORD-TEST-123');
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

    public function test_cash_on_hand_when_delivery_arrives_and_confirm_arrival_payment(): void
    {
        $user = User::factory()->create(['loyalty_points' => 0]);
        Sanctum::actingAs($user);
        $product = Product::first();

        $checkoutRes = $this->postJson('/api/v1/orders/checkout', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'price' => 40.00,
                    'quantity' => 1,
                ],
            ],
            'payment_method' => 'cash_on_delivery',
            'customer_name' => 'Vanna Sok',
            'customer_phone' => '+855 12 777 666',
            'delivery_address' => 'Tuol Kork, Phnom Penh',
        ]);

        $checkoutRes->assertStatus(201)
            ->assertJsonPath('data.payment_mode', 'cash_on_delivery')
            ->assertJsonPath('data.points_earned', 5);
        $this->assertEquals(
            (float) $checkoutRes->json('data.order.total_amount'),
            (float) $checkoutRes->json('data.amount_due_on_arrival')
        );
        $this->assertSame(0, (int) $user->fresh()->loyalty_points);

        $orderNumber = $checkoutRes->json('data.order.order_number');
        $this->assertNotEmpty($orderNumber);

        // Confirm cash on hand paid when courier arrives at location
        $confirmRes = $this->postJson("/api/v1/orders/track/{$orderNumber}/confirm-payment");
        $confirmRes->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.amount_due_on_arrival', 0);
        $this->assertSame(5, (int) $user->fresh()->loyalty_points);
    }
}
