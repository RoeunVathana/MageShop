<?php

namespace Tests\Feature\Media;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CloudMediaStorageTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->admin = User::factory()->create(['email' => 'admin_media@megacommerce.internal']);
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'ADMIN']);
        $this->admin->roles()->attach($adminRole->id);
    }

    public function test_public_can_access_media_proxy_when_file_exists(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('test-image.jpg', 'fake-image-binary-data');

        $response = $this->get('/api/v1/media/test-image.jpg');

        $this->assertTrue(in_array($response->getStatusCode(), [200, 307]));
    }

    public function test_media_proxy_returns_404_when_file_does_not_exist(): void
    {
        Storage::fake('s3');
        Storage::fake('public');

        $response = $this->getJson('/api/v1/media/non-existent-file-999.png');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_unauthenticated_user_cannot_upload_media(): void
    {
        $file = UploadedFile::fake()->image('banner.jpg', 800, 400);

        $response = $this->postJson('/api/v1/admin/media/upload', [
            'file' => $file,
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_admin_can_upload_image_to_cloud_storage(): void
    {
        Storage::fake('public');
        Storage::fake('s3');

        Sanctum::actingAs($this->admin);

        $file = UploadedFile::fake()->image('hero-banner.jpg', 1200, 600);

        $response = $this->postJson('/api/v1/admin/media/upload', [
            'file' => $file,
            'folder' => 'banners',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Media successfully uploaded to cloud storage',
            ])
            ->assertJsonStructure([
                'data' => [
                    'key',
                    'url',
                    'cloud_url',
                    'original_name',
                    'mime_type',
                    'size',
                    'disk',
                ],
            ]);

        $key = $response->json('data.key');
        $this->assertStringStartsWith('banners/', $key);
    }

    public function test_admin_cannot_upload_disallowed_file_extension(): void
    {
        Sanctum::actingAs($this->admin);

        $file = UploadedFile::fake()->create('malicious.exe', 1024, 'application/x-msdownload');

        $response = $this->postJson('/api/v1/admin/media/upload', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_media_sync_cloud_command_executes_successfully(): void
    {
        Storage::fake('public');
        Storage::fake('s3');

        $this->artisan('media:sync-cloud')
            ->assertExitCode(0);
    }
}
