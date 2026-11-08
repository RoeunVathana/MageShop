<?php

namespace Tests\Feature\Banner;

use App\Models\Banner;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BannerManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->admin = User::factory()->create(['email' => 'admin_banner@megacommerce.internal']);
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'ADMIN']);
        $this->admin->roles()->attach($adminRole->id);

        $this->customer = User::factory()->create(['email' => 'customer_banner@megacommerce.internal']);
        $customerRole = Role::firstOrCreate(['slug' => 'customer'], ['name' => 'CUSTOMER']);
        $this->customer->roles()->attach($customerRole->id);
    }

    public function test_public_user_can_list_active_banners(): void
    {
        $response = $this->getJson('/api/v1/banners?placement=hero');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'title', 'subtitle', 'badge_text', 'placement', 'sort_order', 'is_active'],
                ],
            ]);

        $this->assertNotEmpty($response->json('data'));
    }

    public function test_inactive_banners_are_hidden_from_public(): void
    {
        $inactive = Banner::create([
            'title' => 'Secret Inactive Banner',
            'placement' => 'hero',
            'is_active' => false,
            'sort_order' => 99,
        ]);

        $response = $this->getJson('/api/v1/banners?placement=hero');

        $titles = collect($response->json('data'))->pluck('title')->toArray();
        $this->assertNotContains('Secret Inactive Banner', $titles);
    }

    public function test_public_user_can_track_banner_click(): void
    {
        $banner = Banner::first();
        $initialClicks = $banner->clicks_count;

        $response = $this->postJson("/api/v1/banners/{$banner->id}/click");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'clicks_count' => $initialClicks + 1,
            ]);

        $banner->refresh();
        $this->assertEquals($initialClicks + 1, $banner->clicks_count);
    }

    public function test_admin_can_list_all_banners_including_inactive(): void
    {
        Sanctum::actingAs($this->admin);

        Banner::create([
            'title' => 'Draft New Banner',
            'placement' => 'hero',
            'is_active' => false,
            'sort_order' => 99,
        ]);

        $response = $this->getJson('/api/v1/admin/banners');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $titles = collect($response->json('data'))->pluck('title')->toArray();
        $this->assertContains('Draft New Banner', $titles);
    }

    public function test_admin_can_create_slide_banner(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'title' => 'Water Festival Super Clearance',
            'subtitle' => 'Save up to 60% on all outdoor lifestyle gear, camping accessories, and waterproof bags.',
            'badge_text' => 'Festival Special',
            'image_url' => 'https://images.unsplash.com/photo-festival.jpg',
            'link_url' => '/products?category=sports-outdoors',
            'button_text' => 'Shop Clearance',
            'background_style' => 'gradient-amber',
            'placement' => 'hero',
            'sort_order' => 5,
            'is_active' => true,
        ];

        $response = $this->postJson('/api/v1/admin/banners', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'title' => 'Water Festival Super Clearance',
                    'sort_order' => 5,
                ],
            ]);

        $this->assertDatabaseHas('banners', [
            'title' => 'Water Festival Super Clearance',
            'placement' => 'hero',
        ]);
    }

    public function test_customer_cannot_manage_banners(): void
    {
        Sanctum::actingAs($this->customer);

        $response = $this->postJson('/api/v1/admin/banners', [
            'title' => 'Unauthorized Banner',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_banner(): void
    {
        Sanctum::actingAs($this->admin);

        $banner = Banner::first();

        $response = $this->patchJson("/api/v1/admin/banners/{$banner->id}", [
            'title' => 'Updated Banner Headline 2026',
            'placement' => $banner->placement,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'title' => 'Updated Banner Headline 2026',
                ],
            ]);

        $this->assertDatabaseHas('banners', [
            'id' => $banner->id,
            'title' => 'Updated Banner Headline 2026',
        ]);
    }

    public function test_admin_can_toggle_banner_active_status(): void
    {
        Sanctum::actingAs($this->admin);

        $banner = Banner::first();
        $oldState = $banner->is_active;

        $response = $this->postJson("/api/v1/admin/banners/{$banner->id}/toggle");

        $response->assertStatus(200);

        $banner->refresh();
        $this->assertEquals(! $oldState, $banner->is_active);
    }

    public function test_admin_can_reorder_banners(): void
    {
        Sanctum::actingAs($this->admin);

        $banners = Banner::take(2)->get();
        $b1 = $banners[0];
        $b2 = $banners[1];

        $response = $this->postJson('/api/v1/admin/banners/reorder', [
            'items' => [
                ['id' => $b1->id, 'sort_order' => 10],
                ['id' => $b2->id, 'sort_order' => 20],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertEquals(10, $b1->fresh()->sort_order);
        $this->assertEquals(20, $b2->fresh()->sort_order);
    }

    public function test_admin_can_delete_banner(): void
    {
        Sanctum::actingAs($this->admin);

        $banner = Banner::create([
            'title' => 'Banner To Delete',
            'placement' => 'hero',
        ]);

        $response = $this->deleteJson("/api/v1/admin/banners/{$banner->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('banners', ['id' => $banner->id]);
    }
}

