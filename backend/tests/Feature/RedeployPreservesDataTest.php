<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Brand;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Simulates a server redeploy (which re-runs `php artisan db:seed --force`)
 * and verifies admin-managed content, images and videos are preserved.
 */
class RedeployPreservesDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_redeploy_does_not_restore_deleted_banners(): void
    {
        $this->seed(DatabaseSeeder::class);
        $count = Banner::count();
        $this->assertGreaterThan(0, $count);

        Banner::query()->first()->delete();

        $this->seed(DatabaseSeeder::class); // redeploy

        $this->assertSame($count - 1, Banner::count());
    }

    public function test_redeploy_does_not_overwrite_admin_edited_media_urls(): void
    {
        $this->seed(DatabaseSeeder::class);

        $banner = Banner::query()->first();
        $banner->update([
            'image_url' => '/api/v1/media/banners/admin-upload.jpg',
            'video_url' => '/api/v1/media/videos/admin-upload.mp4',
        ]);

        $brand = Brand::query()->first();
        $brand->update(['logo_url' => '/api/v1/media/brands/admin-logo.png', 'is_active' => false]);

        $this->seed(DatabaseSeeder::class); // redeploy

        $this->assertSame('/api/v1/media/banners/admin-upload.jpg', $banner->fresh()->image_url);
        $this->assertSame('/api/v1/media/videos/admin-upload.mp4', $banner->fresh()->video_url);
        $this->assertSame('/api/v1/media/brands/admin-logo.png', $brand->fresh()->logo_url);
        $this->assertFalse((bool) $brand->fresh()->is_active);
    }

    public function test_content_seeders_are_recorded_once(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(4, DB::table('seeder_runs')->count());
    }
}
