<?php

namespace Tests\Feature\Category;

use App\Models\Category;
use App\Models\CategoryAttribute;
use App\Models\CategoryAttributeOption;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryHierarchyAndAttributesTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $customerUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Admin User
        $this->adminUser = User::factory()->create([
            'email' => 'admin.marketplace@megacommerce.local',
        ]);
        $adminRole = Role::where('name', 'ADMIN')->firstOrFail();
        $this->adminUser->roles()->attach($adminRole->id);

        // Customer User
        $this->customerUser = User::factory()->create([
            'email' => 'customer.shopper@megacommerce.local',
        ]);
        $customerRole = Role::where('name', 'CUSTOMER')->firstOrFail();
        $this->customerUser->roles()->attach($customerRole->id);
    }

    public function test_public_user_can_view_category_tree_hierarchy(): void
    {
        $response = $this->getJson('/api/v1/categories?tree=true');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'parent_id',
                        'icon',
                        'children' => [
                            '*' => [
                                'id',
                                'name',
                                'slug',
                                'parent_id',
                            ],
                        ],
                    ],
                ],
            ]);

        // Verify root categories have null parent_id
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $cat) {
            $this->assertNull($cat['parent_id']);
        }
    }

    public function test_admin_can_create_nested_subcategory(): void
    {
        Sanctum::actingAs($this->adminUser);

        $root = Category::where('slug', 'fashion-clothing')->firstOrFail();

        $payload = [
            'parent_id' => $root->id,
            'name' => 'Designer Handbags & Totes',
            'slug' => 'designer-handbags-totes',
            'icon' => 'Briefcase',
            'description' => 'Luxury handcrafted leather bags and travel totes',
            'sort_order' => 10,
        ];

        $response = $this->postJson('/api/v1/admin/categories', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Designer Handbags & Totes',
                    'slug' => 'designer-handbags-totes',
                    'parent_id' => $root->id,
                    'parent_name' => 'Fashion & Clothing',
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'slug' => 'designer-handbags-totes',
            'parent_id' => $root->id,
        ]);
    }

    public function test_category_hierarchy_cycle_prevention_rejects_circular_parent_assignment(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Setup Grandparent -> Parent -> Child hierarchy
        $grandparent = Category::create(['name' => 'Level 1 Root', 'slug' => 'lvl-1-root']);
        $parent = Category::create(['name' => 'Level 2 Child', 'slug' => 'lvl-2-child', 'parent_id' => $grandparent->id]);
        $child = Category::create(['name' => 'Level 3 Grandchild', 'slug' => 'lvl-3-grandchild', 'parent_id' => $parent->id]);

        // Attempt 1: Setting a category's parent to itself
        $selfResponse = $this->patchJson("/api/v1/admin/categories/{$grandparent->id}", [
            'parent_id' => $grandparent->id,
        ]);
        $selfResponse->assertStatus(422);
        $this->assertStringContainsString('circular', strtolower($selfResponse->json('message')));

        // Attempt 2: Setting grandparent's parent to its grandchild (creating 1 -> 2 -> 3 -> 1 loop)
        $loopResponse = $this->patchJson("/api/v1/admin/categories/{$grandparent->id}", [
            'parent_id' => $child->id,
        ]);
        $loopResponse->assertStatus(422);
        $this->assertStringContainsString('circular', strtolower($loopResponse->json('message')));

        // Verify grandparent's parent was not modified
        $this->assertNull($grandparent->fresh()->parent_id);
    }

    public function test_admin_can_add_custom_attributes_and_options_to_category(): void
    {
        Sanctum::actingAs($this->adminUser);

        $category = Category::where('slug', 'furniture')->firstOrFail();

        $payload = [
            'name' => 'Wood Finish Coating',
            'code' => 'wood_finish',
            'type' => 'select',
            'is_required' => false,
            'is_filterable' => true,
            'is_variant_option' => true,
            'options' => [
                ['value' => 'matte_walnut', 'label' => 'Matte Walnut', 'sort_order' => 1],
                ['value' => 'glossy_cherry', 'label' => 'Glossy Cherry', 'sort_order' => 2],
                ['value' => 'raw_oak', 'label' => 'Natural Raw Oak', 'sort_order' => 3],
            ],
        ];

        $response = $this->postJson("/api/v1/admin/categories/{$category->id}/attributes", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Wood Finish Coating',
                    'code' => 'wood_finish',
                    'type' => 'select',
                    'is_variant_option' => true,
                ],
            ]);

        $this->assertDatabaseHas('category_attributes', [
            'category_id' => $category->id,
            'code' => 'wood_finish',
        ]);

        $this->assertDatabaseHas('category_attribute_options', [
            'value' => 'matte_walnut',
            'label' => 'Matte Walnut',
        ]);
    }

    public function test_category_required_attribute_validation(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Books category requires 'author' attribute
        $bookCat = Category::where('slug', 'books-stationery')->firstOrFail();

        // 1. Omit required author attribute -> must fail with 422
        $payloadMissing = [
            'name' => 'Clean Code: A Handbook of Agile Software Craftsmanship',
            'sku' => 'BOOK-CLN-001',
            'selling_price' => 38.50,
            'category_id' => $bookCat->id,
            'attributes' => [
                ['code' => 'isbn', 'value' => '978-0132350884'],
                // Missing required 'author'
            ],
        ];

        $failResponse = $this->postJson('/api/v1/products', $payloadMissing);
        $failResponse->assertStatus(422);
        $this->assertStringContainsString('author', strtolower($failResponse->json('message')));

        // 2. Supply required author attribute -> succeeds
        $authorAttr = CategoryAttribute::where('category_id', $bookCat->id)->where('code', 'author')->firstOrFail();

        $payloadValid = [
            'name' => 'Clean Code: A Handbook of Agile Software Craftsmanship',
            'sku' => 'BOOK-CLN-001',
            'selling_price' => 38.50,
            'category_id' => $bookCat->id,
            'attributes' => [
                ['attribute_id' => $authorAttr->id, 'value' => 'Robert C. Martin'],
                ['code' => 'isbn', 'value' => '978-0132350884'],
            ],
        ];

        $successResponse = $this->postJson('/api/v1/products', $payloadValid);
        $successResponse->assertStatus(201);

        $this->assertDatabaseHas('product_attribute_values', [
            'value' => 'Robert C. Martin',
        ]);
    }

    public function test_variable_product_creation_with_sku_level_inventories(): void
    {
        Sanctum::actingAs($this->adminUser);

        $fashionCat = Category::where('slug', 'fashion-clothing')->firstOrFail();
        $sizeAttr = CategoryAttribute::where('category_id', $fashionCat->id)->where('code', 'size')->firstOrFail();
        $colorAttr = CategoryAttribute::where('category_id', $fashionCat->id)->where('code', 'color')->firstOrFail();

        $sizeM = CategoryAttributeOption::where('category_attribute_id', $sizeAttr->id)->where('value', 'M')->firstOrFail();
        $sizeL = CategoryAttributeOption::where('category_attribute_id', $sizeAttr->id)->where('value', 'L')->firstOrFail();

        $payload = [
            'name' => 'Premium Heavyweight Organic Cotton Tee',
            'sku' => 'TEE-HVY-ROOT',
            'brand' => 'MegaBasics',
            'product_type' => 'variable',
            'selling_price' => 29.99,
            'cost_price' => 12.00,
            'category_id' => $fashionCat->id,
            'attributes' => [
                ['attribute_id' => $sizeAttr->id, 'selected_option_id' => $sizeM->id],
                ['attribute_id' => $colorAttr->id, 'value' => 'Black'],
            ],
            'variants' => [
                [
                    'sku' => 'TEE-HVY-BLK-M',
                    'name' => 'Heavyweight Tee - Black / Medium',
                    'selling_price' => 29.99,
                    'cost_price' => 12.00,
                    'initial_stock' => 45,
                    'attribute_values' => [
                        ['attribute_id' => $sizeAttr->id, 'option_id' => $sizeM->id],
                    ],
                ],
                [
                    'sku' => 'TEE-HVY-BLK-L',
                    'name' => 'Heavyweight Tee - Black / Large',
                    'selling_price' => 29.99,
                    'cost_price' => 12.00,
                    'initial_stock' => 60,
                    'attribute_values' => [
                        ['attribute_id' => $sizeAttr->id, 'option_id' => $sizeL->id],
                    ],
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'sku' => 'TEE-HVY-ROOT',
                    'product_type' => 'variable',
                    'brand' => 'MegaBasics',
                ],
            ]);

        $createdProduct = Product::where('sku', 'TEE-HVY-ROOT')->firstOrFail();

        // Total stock of parent is sum of variants (45 + 60 = 105)
        $this->assertEquals(105, $createdProduct->stock_quantity);

        // Verify variant 1 in database
        $varM = ProductVariant::where('sku', 'TEE-HVY-BLK-M')->firstOrFail();
        $this->assertEquals(45, $varM->stock_quantity);

        // Verify variant 1 has dedicated 1:1 inventory record
        $this->assertDatabaseHas('inventories', [
            'product_id' => $createdProduct->id,
            'variant_id' => $varM->id,
            'quantity_on_hand' => 45,
        ]);

        // Verify variant 2 has dedicated 1:1 inventory record
        $varL = ProductVariant::where('sku', 'TEE-HVY-BLK-L')->firstOrFail();
        $this->assertDatabaseHas('inventories', [
            'product_id' => $createdProduct->id,
            'variant_id' => $varL->id,
            'quantity_on_hand' => 60,
        ]);

        // Verify movement log exists for variant
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $createdProduct->id,
            'variant_id' => $varM->id,
            'quantity_change' => 45,
            'movement_type' => 'STOCK_IN',
        ]);
    }

    public function test_variant_sku_must_be_globally_unique(): void
    {
        Sanctum::actingAs($this->adminUser);

        $existingProduct = Product::firstOrFail();

        $payload = [
            'name' => 'Variant with Duplicate SKU',
            'sku' => 'DUP-ROOT-001',
            'product_type' => 'variable',
            'selling_price' => 19.99,
            'variants' => [
                [
                    'sku' => $existingProduct->sku, // Collision with existing product SKU!
                    'name' => 'Colliding Variant',
                    'selling_price' => 19.99,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/products', $payload);
        $response->assertStatus(422);
        $this->assertStringContainsString('already exists', strtolower($response->json('message')));
    }

    public function test_customer_cannot_modify_categories_or_attributes(): void
    {
        Sanctum::actingAs($this->customerUser);

        // Category create attempt
        $res1 = $this->postJson('/api/v1/admin/categories', ['name' => 'Illegal Cat']);
        $res1->assertStatus(403);

        // Category delete attempt
        $category = Category::firstOrFail();
        $res2 = $this->deleteJson("/api/v1/admin/categories/{$category->id}");
        $res2->assertStatus(403);

        // Attribute create attempt
        $res3 = $this->postJson("/api/v1/admin/categories/{$category->id}/attributes", ['name' => 'Hack Attr', 'type' => 'text']);
        $res3->assertStatus(403);
    }

    public function test_admin_can_update_product_variants_and_attributes(): void
    {
        Sanctum::actingAs($this->adminUser);

        $category = Category::where('slug', 'fashion-clothing')->firstOrFail();
        $sizeAttr = CategoryAttribute::where('category_id', $category->id)->where('code', 'size')->first();

        // Create product first
        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Original Variable Shirt',
            'slug' => 'original-variable-shirt',
            'sku' => 'UPDATE-TEST-VAR',
            'product_type' => 'variable',
            'selling_price' => 50.00,
            'price' => 50.00,
            'stock_quantity' => 10,
            'is_active' => true,
            'status' => 'active',
        ]);

        $initialVar = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'UPDATE-TEST-VAR-1',
            'name' => 'Option 1',
            'selling_price' => 50.00,
            'stock_quantity' => 10,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'variant_id' => $initialVar->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
        ]);

        $updatePayload = [
            'name' => 'Updated Variable Shirt',
            'brand' => 'MegaWear',
            'variants' => [
                [
                    'id' => $initialVar->id,
                    'sku' => 'UPDATE-TEST-VAR-1',
                    'name' => 'Option 1 (Updated)',
                    'selling_price' => 55.00,
                    'stock_quantity' => 25, // +15 units
                ],
                [
                    'sku' => 'UPDATE-TEST-VAR-2',
                    'name' => 'Option 2 (New)',
                    'selling_price' => 60.00,
                    'initial_stock' => 30,
                ],
            ],
        ];

        $response = $this->patchJson("/api/v1/products/{$product->id}", $updatePayload);

        $response->assertStatus(200);
        $this->assertEquals('Updated Variable Shirt', $response->json('data.name'));
        $this->assertEquals('MegaWear', $response->json('data.brand'));
        $this->assertCount(2, $response->json('data.variants'));

        // Verify updated variant
        $initialVar->refresh();
        $this->assertEquals(55.00, $initialVar->selling_price);
        $this->assertEquals(25, $initialVar->stock_quantity);

        // Verify new variant created
        $newVar = ProductVariant::where('sku', 'UPDATE-TEST-VAR-2')->firstOrFail();
        $this->assertEquals(60.00, $newVar->selling_price);
        $this->assertEquals(30, $newVar->stock_quantity);

        // Total product stock = 25 + 30 = 55
        $product->refresh();
        $this->assertEquals(55, $product->stock_quantity);

        // Verify inventory movement logged for stock increase (+15)
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'variant_id' => $initialVar->id,
            'quantity_change' => 15,
        ]);
    }
}

