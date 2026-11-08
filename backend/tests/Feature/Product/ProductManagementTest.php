<?php

namespace Tests\Feature\Product;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $customerUser;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Create Admin User
        $this->adminUser = User::factory()->create([
            'email' => 'admin.catalog@megacommerce.local',
        ]);
        $adminRole = Role::where('name', 'ADMIN')->firstOrFail();
        $this->adminUser->roles()->attach($adminRole->id);

        // Create Customer User
        $this->customerUser = User::factory()->create([
            'email' => 'customer.catalog@megacommerce.local',
        ]);
        $customerRole = Role::where('name', 'CUSTOMER')->firstOrFail();
        $this->customerUser->roles()->attach($customerRole->id);

        // Create test category
        $this->category = Category::firstOrCreate(
            ['slug' => 'audio-electronics'],
            ['name' => 'Audio & Electronics', 'description' => 'Headphones and speakers']
        );
    }

    public function test_public_user_can_view_product_catalog_without_cost_price(): void
    {
        $response = $this->getJson('/api/v1/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'sku',
                        'selling_price',
                        'cost_price',
                        'available_stock',
                        'status',
                    ],
                ],
                'meta' => ['total', 'current_page', 'last_page'],
            ]);

        // Sensitive cost_price must never leak to public visitors
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $this->assertNull($item['cost_price'], 'cost_price must be null for public visitors');
        }
    }

    public function test_public_user_can_view_single_product_without_cost_price(): void
    {
        $product = Product::firstOrFail();

        $response = $this->getJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'cost_price' => null,
                ],
            ]);
    }

    public function test_admin_user_can_view_sensitive_cost_price(): void
    {
        Sanctum::actingAs($this->adminUser);
        $product = Product::firstOrFail();

        $response = $this->getJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.cost_price'), 'Cost price must be visible to Admin');
    }

    public function test_customer_cannot_view_sensitive_cost_price(): void
    {
        Sanctum::actingAs($this->customerUser);
        $product = Product::firstOrFail();

        $response = $this->getJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200);
        $this->assertNull($response->json('data.cost_price'), 'Cost price must remain masked for customer');
    }

    public function test_authorized_admin_can_create_product_with_initial_inventory(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'name' => 'Logitech MX Master 3S Wireless Mouse',
            'sku' => 'LOGI-MX3S-GRY',
            'description' => 'Ergonomic high-performance wireless mouse with 8K DPI sensor',
            'selling_price' => 99.99,
            'cost_price' => 65.50,
            'category_id' => $this->category->id,
            'initial_stock' => 50,
            'low_stock_threshold' => 10,
            'status' => 'active',
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Logitech MX Master 3S Wireless Mouse',
                    'sku' => 'LOGI-MX3S-GRY',
                    'selling_price' => 99.99,
                    'cost_price' => 65.50,
                    'available_stock' => 50,
                    'quantity_on_hand' => 50,
                    'status' => 'active',
                ],
            ]);

        // Verify product in database
        $this->assertDatabaseHas('products', [
            'sku' => 'LOGI-MX3S-GRY',
            'selling_price' => 99.99,
            'cost_price' => 65.50,
            'status' => 'active',
        ]);

        // Verify 1:1 inventory record was automatically initialized
        $product = Product::where('sku', 'LOGI-MX3S-GRY')->firstOrFail();
        $this->assertDatabaseHas('inventories', [
            'product_id' => $product->id,
            'quantity_on_hand' => 50,
            'quantity_reserved' => 0,
        ]);

        // Verify initial movement ledger record was written
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'movement_type' => 'STOCK_IN',
            'quantity_change' => 50,
            'before_quantity' => 0,
            'after_quantity' => 50,
        ]);
    }

    public function test_product_creation_rejects_duplicate_sku(): void
    {
        Sanctum::actingAs($this->adminUser);
        $existing = Product::firstOrFail();

        $payload = [
            'name' => 'Duplicate SKU Item',
            'sku' => $existing->sku,
            'selling_price' => 49.99,
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    public function test_product_creation_rejects_negative_prices(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'name' => 'Negative Price Item',
            'sku' => 'TEST-NEG-001',
            'selling_price' => -10.00,
            'cost_price' => -5.00,
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['selling_price', 'cost_price']);
    }

    public function test_customer_cannot_create_or_modify_products(): void
    {
        Sanctum::actingAs($this->customerUser);

        $payload = [
            'name' => 'Unauthorized Item',
            'sku' => 'UNAUTH-001',
            'selling_price' => 19.99,
        ];

        $response = $this->postJson('/api/v1/products', $payload);
        $response->assertStatus(403);
    }

    public function test_admin_can_update_product(): void
    {
        Sanctum::actingAs($this->adminUser);
        $product = Product::firstOrFail();

        $response = $this->patchJson("/api/v1/products/{$product->id}", [
            'name' => 'Updated Super Smartphone Pro',
            'selling_price' => 1199.99,
            'cost_price' => 850.00,
            'status' => 'draft',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $product->id,
                    'name' => 'Updated Super Smartphone Pro',
                    'selling_price' => 1199.99,
                    'status' => 'draft',
                ],
            ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Super Smartphone Pro',
            'selling_price' => 1199.99,
            'status' => 'draft',
        ]);
    }

    public function test_admin_can_safely_archive_product(): void
    {
        Sanctum::actingAs($this->adminUser);
        $product = Product::firstOrFail();

        $response = $this->deleteJson("/api/v1/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $product->id,
                    'status' => 'archived',
                    'is_active' => false,
                ],
            ]);

        // Record must NOT be deleted from PostgreSQL, only safely marked archived
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'status' => 'archived',
            'is_active' => false,
        ]);
    }

    public function test_public_user_can_view_single_product_by_slug(): void
    {
        $product = Product::firstOrFail();

        $response = $this->getJson("/api/v1/products/{$product->slug}");

        $response->assertStatus(200)
            ->assertJsonPath('data.slug', $product->slug)
            ->assertJsonPath('data.sku', $product->sku);
    }

    public function test_nonexistent_product_and_category_slug_returns_404_not_500(): void
    {
        // Non-existent product slug must return structured 404, NEVER PostgreSQL 22P02 exception 500
        $prodResponse = $this->getJson('/api/v1/products/totally-nonexistent-slug-xyz');
        $prodResponse->assertStatus(404);

        // Non-existent category slug must return structured 404
        $catResponse = $this->getJson('/api/v1/categories/nonexistent-category-slug-abc/attributes');
        $catResponse->assertStatus(404);
    }

    public function test_public_user_can_filter_products_by_category_slug(): void
    {
        $response = $this->getJson("/api/v1/products?category_id={$this->category->slug}");

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_admin_can_create_product_with_advanced_flags_and_discounts(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'name' => 'Flagship Smart Watch Ultimate',
            'sku' => 'WATCH-ULT-2026',
            'selling_price' => 399.00,
            'cost_price' => 220.00,
            'discount_price' => 349.00,
            'is_featured' => true,
            'is_flash_sale' => true,
            'initial_stock' => 15,
            'specifications' => [
                'display' => 'AMOLED 1.4 inch',
                'battery_life' => '7 days',
            ],
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.is_featured', true)
            ->assertJsonPath('data.is_flash_sale', true)
            ->assertJsonPath('data.discount_price', 349);

        $this->assertDatabaseHas('products', [
            'sku' => 'WATCH-ULT-2026',
            'is_featured' => true,
            'is_flash_sale' => true,
        ]);
    }
}

