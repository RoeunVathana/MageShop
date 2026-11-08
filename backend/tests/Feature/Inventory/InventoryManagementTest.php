<?php

namespace Tests\Feature\Inventory;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $customerUser;
    protected Product $testProduct;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Create Admin User with INVENTORY_MANAGER and ADMIN roles
        $this->adminUser = User::factory()->create([
            'email' => 'warehouse.manager@megacommerce.local',
        ]);
        $adminRole = Role::where('name', 'ADMIN')->firstOrFail();
        $this->adminUser->roles()->attach($adminRole->id);

        // Create Customer User
        $this->customerUser = User::factory()->create([
            'email' => 'customer.shopper@megacommerce.local',
        ]);
        $customerRole = Role::where('name', 'CUSTOMER')->firstOrFail();
        $this->customerUser->roles()->attach($customerRole->id);

        // Grab or initialize a test product with known stock
        $this->testProduct = Product::firstOrFail();
        $inventory = $this->testProduct->inventory;
        if (! $inventory) {
            $inventory = Inventory::create([
                'product_id' => $this->testProduct->id,
                'quantity_on_hand' => 20,
                'quantity_reserved' => 0,
            ]);
        } else {
            $inventory->update([
                'quantity_on_hand' => 20,
                'quantity_reserved' => 0,
            ]);
        }
        $this->testProduct->update(['stock_quantity' => 20]);
    }

    public function test_admin_can_view_inventory_list(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->getJson('/api/v1/inventory');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'sku',
                        'quantity_on_hand',
                        'quantity_reserved',
                        'available_stock',
                        'low_stock_threshold',
                    ],
                ],
            ]);
    }

    public function test_customer_cannot_view_inventory_list(): void
    {
        Sanctum::actingAs($this->customerUser);

        $response = $this->getJson('/api/v1/inventory');
        $response->assertStatus(403);
    }

    public function test_admin_can_view_product_inventory_details(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->getJson("/api/v1/inventory/{$this->testProduct->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'product_id' => $this->testProduct->id,
                    'quantity_on_hand' => 20,
                    'quantity_reserved' => 0,
                    'available_stock' => 20,
                ],
            ]);
    }

    public function test_stock_in_increases_inventory_and_logs_movement(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'quantity_change' => 30,
            'movement_type' => 'STOCK_IN',
            'reason' => 'Received inbound PO #PO-9912',
            'reference' => 'PO-9912',
        ];

        $response = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", $payload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'inventory' => [
                        'quantity_on_hand' => 50,
                        'available_stock' => 50,
                    ],
                    'movement' => [
                        'movement_type' => 'STOCK_IN',
                        'quantity_change' => 30,
                        'before_quantity' => 20,
                        'after_quantity' => 50,
                        'reason' => 'Received inbound PO #PO-9912',
                        'reference' => 'PO-9912',
                    ],
                ],
            ]);

        // Verify database reflects updated counts
        $this->assertDatabaseHas('inventories', [
            'product_id' => $this->testProduct->id,
            'quantity_on_hand' => 50,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $this->testProduct->id,
            'stock_quantity' => 50,
        ]);
    }

    public function test_stock_out_reduces_inventory_and_logs_movement(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'quantity_change' => -5,
            'movement_type' => 'STOCK_OUT',
            'reason' => 'Sample unit dispatch to showroom',
            'reference' => 'DISP-441',
        ];

        $response = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", $payload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'inventory' => [
                        'quantity_on_hand' => 15,
                        'available_stock' => 15,
                    ],
                    'movement' => [
                        'movement_type' => 'STOCK_OUT',
                        'quantity_change' => -5,
                        'before_quantity' => 20,
                        'after_quantity' => 15,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('inventories', [
            'product_id' => $this->testProduct->id,
            'quantity_on_hand' => 15,
        ]);
    }

    public function test_negative_stock_adjustment_is_strictly_rejected(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Attempt to deduct 35 units when only 20 are available
        $payload = [
            'quantity_change' => -35,
            'movement_type' => 'STOCK_OUT',
            'reason' => 'Overdraft attempt',
        ];

        $response = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", $payload);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);

        $this->assertStringContainsString('Insufficient inventory', $response->json('message'));

        // Stock must remain unchanged at 20
        $this->assertDatabaseHas('inventories', [
            'product_id' => $this->testProduct->id,
            'quantity_on_hand' => 20,
        ]);
    }

    public function test_reducing_stock_below_reserved_quantity_is_rejected(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Set 8 reserved units for customer orders
        Inventory::updateOrCreate(
            ['product_id' => $this->testProduct->id],
            ['quantity_on_hand' => 20, 'quantity_reserved' => 8]
        );

        // Attempting to deduct 15 units would leave 5 on hand, less than 8 reserved
        $payload = [
            'quantity_change' => -15,
            'movement_type' => 'STOCK_OUT',
            'reason' => 'Illegal reduction into reserved allocation',
        ];

        $response = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('reserved', strtolower($response->json('message')));

        // Stock must remain at 20
        $this->assertDatabaseHas('inventories', [
            'product_id' => $this->testProduct->id,
            'quantity_on_hand' => 20,
        ]);
    }

    public function test_idempotency_key_replay_prevents_duplicate_deduction(): void
    {
        Sanctum::actingAs($this->adminUser);

        $idempotencyKey = 'test_key_replay_' . uniqid();

        $payload = [
            'quantity_change' => 10,
            'movement_type' => 'STOCK_IN',
            'reason' => 'First restock attempt',
            'idempotency_key' => $idempotencyKey,
        ];

        // First attempt -> stock becomes 30
        $firstResponse = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", $payload);
        $firstResponse->assertStatus(200);
        $this->assertEquals(30, $firstResponse->json('data.inventory.quantity_on_hand'));

        // Second attempt with identical idempotency_key -> must return cached movement without adding 10 again!
        $replayResponse = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", $payload);
        $replayResponse->assertStatus(200);

        // Final stock MUST still be 30, NOT 40
        $freshInventory = $this->testProduct->inventory()->first();
        $this->assertEquals(30, $freshInventory->quantity_on_hand);
    }

    public function test_admin_can_view_movement_history(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Perform two adjustments to populate history
        $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", [
            'quantity_change' => 5,
            'movement_type' => 'STOCK_IN',
            'reason' => 'History item 1',
        ]);

        $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", [
            'quantity_change' => -2,
            'movement_type' => 'DAMAGE',
            'reason' => 'Damaged during inspection',
        ]);

        $response = $this->getJson("/api/v1/inventory/{$this->testProduct->id}/movements");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'movement_type',
                        'quantity_change',
                        'before_quantity',
                        'after_quantity',
                        'reason',
                        'creator_name',
                        'created_at',
                    ],
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    public function test_customer_cannot_adjust_inventory_or_view_movement_history(): void
    {
        Sanctum::actingAs($this->customerUser);

        $adjustRes = $this->postJson("/api/v1/inventory/{$this->testProduct->id}/adjust", [
            'quantity_change' => 10,
            'movement_type' => 'STOCK_IN',
            'reason' => 'Unauthorized hack',
        ]);
        $adjustRes->assertStatus(403);

        $historyRes = $this->getJson("/api/v1/inventory/{$this->testProduct->id}/movements");
        $historyRes->assertStatus(403);
    }
}
