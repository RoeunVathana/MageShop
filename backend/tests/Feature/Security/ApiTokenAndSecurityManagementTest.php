<?php

namespace Tests\Feature\Security;

use App\Models\PasswordResetOtp;
use App\Models\Role;
use App\Models\StoreSetting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTokenAndSecurityManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        Mail::fake();

        $this->admin = User::factory()->create([
            'email' => 'admin_sec@megacommerce.internal',
            'status' => 'active',
        ]);
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'ADMIN']);
        $this->admin->roles()->attach($adminRole->id);

        $this->customer = User::factory()->create([
            'email' => 'customer_sec@megacommerce.internal',
            'status' => 'active',
        ]);
        $customerRole = Role::firstOrCreate(['slug' => 'customer'], ['name' => 'CUSTOMER']);
        $this->customer->roles()->attach($customerRole->id);
    }

    public function test_admin_can_list_api_tokens(): void
    {
        Sanctum::actingAs($this->admin);

        $this->admin->createToken('Test Token 1');
        $this->admin->createToken('Test Token 2');

        $response = $this->getJson('/api/v1/admin/api-tokens');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'abilities', 'last_used_at', 'expires_at', 'created_at', 'user'],
                ],
                'meta' => ['total', 'current_page'],
            ]);
    }

    public function test_admin_can_create_api_token_with_abilities_and_expiration(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/api-tokens', [
            'name' => 'Warehouse Scanner Worker',
            'abilities' => ['read:inventory', 'write:inventory'],
            'expires_in_days' => 30,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'name' => 'Warehouse Scanner Worker',
                    'abilities' => ['read:inventory', 'write:inventory'],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.plain_text_token'));
        $this->assertNotNull($response->json('data.expires_at'));
        $this->assertDatabaseHas('personal_access_tokens', [
            'name' => 'Warehouse Scanner Worker',
        ]);
    }

    public function test_customer_cannot_manage_api_tokens(): void
    {
        Sanctum::actingAs($this->customer);

        $response = $this->getJson('/api/v1/admin/api-tokens');
        $response->assertStatus(403);

        $createResponse = $this->postJson('/api/v1/admin/api-tokens', [
            'name' => 'Hacker Token',
        ]);
        $createResponse->assertStatus(403);
    }

    public function test_admin_can_revoke_api_token(): void
    {
        Sanctum::actingAs($this->admin);

        $token = $this->admin->createToken('To Be Deleted');
        $tokenId = $token->accessToken->id;

        $response = $this->deleteJson("/api/v1/admin/api-tokens/{$tokenId}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId,
        ]);
    }

    public function test_admin_can_regenerate_api_token(): void
    {
        Sanctum::actingAs($this->admin);

        $token = $this->admin->createToken('Old Token', ['*']);
        $oldId = $token->accessToken->id;

        $response = $this->postJson("/api/v1/admin/api-tokens/{$oldId}/regenerate");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertNotEmpty($response->json('data.plain_text_token'));
        $newId = $response->json('data.id');
        $this->assertNotEquals($oldId, $newId);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $oldId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $newId]);
    }

    public function test_admin_can_list_users_for_security_management(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/admin/security/users');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'status', 'is_email_verified', 'roles'],
                ],
            ]);
    }

    public function test_admin_can_update_user_email(): void
    {
        Sanctum::actingAs($this->admin);

        $targetUser = User::factory()->create([
            'email' => 'old_target@megacommerce.internal',
        ]);

        $response = $this->patchJson("/api/v1/admin/security/users/{$targetUser->id}/email", [
            'email' => 'new_target@megacommerce.internal',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'email' => 'new_target@megacommerce.internal',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
            'email' => 'new_target@megacommerce.internal',
        ]);
    }

    public function test_admin_updating_email_enforces_unique_constraint(): void
    {
        Sanctum::actingAs($this->admin);

        $existingUser = User::factory()->create([
            'email' => 'existing@megacommerce.internal',
        ]);

        $targetUser = User::factory()->create([
            'email' => 'target@megacommerce.internal',
        ]);

        $response = $this->patchJson("/api/v1/admin/security/users/{$targetUser->id}/email", [
            'email' => 'existing@megacommerce.internal',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_admin_can_update_user_password_and_enforce_strength(): void
    {
        Sanctum::actingAs($this->admin);

        $targetUser = User::factory()->create([
            'email' => 'target_pwd@megacommerce.internal',
            'password' => 'InitialPassword123!',
        ]);

        // Weak password fails
        $failResponse = $this->patchJson("/api/v1/admin/security/users/{$targetUser->id}/password", [
            'password' => 'weak',
        ]);
        $failResponse->assertStatus(422);

        // Strong password succeeds
        $successResponse = $this->patchJson("/api/v1/admin/security/users/{$targetUser->id}/password", [
            'password' => 'StrongNewPass2026!',
        ]);

        $successResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $targetUser->refresh();
        $this->assertTrue(Hash::check('StrongNewPass2026!', $targetUser->password));
    }

    public function test_admin_can_dispatch_otp_to_user_email(): void
    {
        Sanctum::actingAs($this->admin);

        $targetUser = User::factory()->create([
            'email' => 'target_otp@megacommerce.internal',
        ]);

        $response = $this->postJson("/api/v1/admin/security/users/{$targetUser->id}/send-otp");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseHas('password_reset_otps', [
            'email' => 'target_otp@megacommerce.internal',
            'is_used' => false,
        ]);
    }

    public function test_admin_can_view_sent_otps_and_invalidate(): void
    {
        Sanctum::actingAs($this->admin);

        $otp = PasswordResetOtp::create([
            'email' => 'audit_otp@megacommerce.internal',
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'is_used' => false,
        ]);

        $listResponse = $this->getJson('/api/v1/admin/security/otps');
        $listResponse->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'email', 'status', 'is_used', 'is_expired', 'attempts', 'expires_at'],
                ],
            ]);

        $invalidateResponse = $this->postJson("/api/v1/admin/security/otps/{$otp->id}/invalidate");
        $invalidateResponse->assertStatus(200);

        $otp->refresh();
        $this->assertTrue($otp->is_used);
    }

    public function test_admin_can_get_and_update_email_settings(): void
    {
        Sanctum::actingAs($this->admin);

        $getResponse = $this->getJson('/api/v1/admin/security/email-settings');
        $getResponse->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['mail_mailer', 'mail_host', 'mail_port', 'mail_username', 'mail_from_address'],
            ]);

        $patchResponse = $this->patchJson('/api/v1/admin/security/email-settings', [
            'mail_mailer' => 'smtp',
            'mail_host' => 'smtp.resend.com',
            'mail_port' => 587,
            'mail_username' => 'resend',
            'mail_password' => 're_test_key_123',
            'mail_encryption' => 'tls',
            'mail_from_address' => 'system@tyushop.blog',
            'mail_from_name' => 'MegaCommerce System',
        ]);

        $patchResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'mail_host' => 'smtp.resend.com',
                    'mail_from_address' => 'system@tyushop.blog',
                ],
            ]);

        $this->assertEquals('smtp.resend.com', StoreSetting::get('mail_host'));
        $this->assertEquals('system@tyushop.blog', StoreSetting::get('mail_from_address'));
    }

    public function test_admin_can_send_test_email_otp(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/security/email-settings/test-otp', [
            'test_email' => 'verifier@megacommerce.internal',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'recipient' => 'verifier@megacommerce.internal',
                ],
            ]);
    }
}
