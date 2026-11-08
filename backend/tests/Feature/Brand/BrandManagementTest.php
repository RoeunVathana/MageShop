<?php

namespace Tests\Feature\Brand;

use App\Models\Brand;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'ADMIN', 'description' => 'Administrator']);
        $customerRole = Role::firstOrCreate(['slug' => 'customer'], ['name' => 'CUSTOMER', 'description' => 'Customer']);

        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->roles()->attach($adminRole->id);

        $this->customer = User::factory()->create(['status' => 'active']);
        $this->customer->roles()->attach($customerRole->id);
    }

    public function test_public_user_can_view_active_brands(): void
    {
        Brand::create([
            'name' => 'Brand Alpha',
            'slug' => 'brand-alpha',
            'status' => 'active',
            'is_active' => true,
        ]);

        Brand::create([
            'name' => 'Brand Hidden',
            'slug' => 'brand-hidden',
            'status' => 'inactive',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/v1/brands');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Brand Alpha')
            ->assertJsonMissing(['name' => 'Brand Hidden']);
    }

    public function test_public_user_can_view_single_brand_by_slug_or_id(): void
    {
        $brand = Brand::create([
            'name' => 'Aura Silk',
            'slug' => 'aura-silk',
            'description' => 'Silk apparel',
            'status' => 'active',
            'is_active' => true,
        ]);

        $responseSlug = $this->getJson('/api/v1/brands/aura-silk');
        $responseSlug->assertStatus(200)
            ->assertJsonPath('data.name', 'Aura Silk');

        $responseId = $this->getJson("/api/v1/brands/{$brand->id}");
        $responseId->assertStatus(200)
            ->assertJsonPath('data.slug', 'aura-silk');
    }

    public function test_admin_can_create_brand_with_translations(): void
    {
        $payload = [
            'name' => 'UrbanPulse',
            'country' => 'Singapore',
            'description' => 'Streetwear and activewear',
            'translations' => [
                ['locale' => 'en', 'name' => 'UrbanPulse', 'description' => 'Streetwear and activewear'],
                ['locale' => 'km', 'name' => 'អ័បិន ផល្ស', 'description' => 'ម៉ូដយុវវ័យសម័យថ្មី'],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/brands', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'UrbanPulse')
            ->assertJsonPath('data.slug', 'urbanpulse')
            ->assertJsonPath('data.country', 'Singapore');

        $this->assertDatabaseHas('brands', ['slug' => 'urbanpulse', 'country' => 'Singapore']);
        $this->assertDatabaseHas('brand_translations', ['locale' => 'km', 'name' => 'អ័បិន ផល្ស']);
    }

    public function test_customer_cannot_create_or_modify_brands(): void
    {
        $createResponse = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/admin/brands', ['name' => 'Unauthorized Brand']);

        $createResponse->assertStatus(403);

        $brand = Brand::create([
            'name' => 'Existing Brand',
            'slug' => 'existing-brand',
            'status' => 'active',
            'is_active' => true,
        ]);

        $updateResponse = $this->actingAs($this->customer, 'sanctum')
            ->patchJson("/api/v1/admin/brands/{$brand->id}", ['name' => 'Hacked Brand']);

        $updateResponse->assertStatus(403);
    }

    public function test_admin_can_update_brand(): void
    {
        $brand = Brand::create([
            'name' => 'Old Name',
            'slug' => 'old-name',
            'status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/brands/{$brand->id}", [
                'name' => 'New Premium Name',
                'description' => 'Updated brand description',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Premium Name');

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'name' => 'New Premium Name',
        ]);
    }

    public function test_admin_can_archive_brand(): void
    {
        $brand = Brand::create([
            'name' => 'Archivable Brand',
            'slug' => 'archivable-brand',
            'status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/brands/{$brand->id}");

        $response->assertStatus(200);

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'status' => 'archived',
            'is_active' => false,
        ]);
    }
}
