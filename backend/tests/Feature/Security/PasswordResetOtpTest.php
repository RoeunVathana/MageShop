<?php

namespace Tests\Feature\Security;

use App\Models\PasswordResetOtp;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_forgot_password_generates_secure_otp(): void
    {
        $user = User::create([
            'name' => 'Alice Buyer',
            'email' => 'alice@megacommerce.internal',
            'password' => 'OldPassword123!',
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'alice@megacommerce.internal',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $otpRecord = PasswordResetOtp::where('email', 'alice@megacommerce.internal')->first();
        $this->assertNotNull($otpRecord);
        $this->assertNotEmpty($otpRecord->otp_hash);
        // Ensure raw OTP is not stored in plaintext
        $this->assertMatchesRegularExpression('/^\$2y\$|\$argon2id\$/', $otpRecord->otp_hash);
    }

    public function test_forgot_password_prevents_account_enumeration(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nonexistent@megacommerce.internal',
        ]);

        // Same 200 response
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }

    public function test_verify_otp_and_reset_password_workflow(): void
    {
        $user = User::create([
            'name' => 'Bob Reset',
            'email' => 'bob@megacommerce.internal',
            'password' => 'OldSecret123!',
        ]);

        // Create OTP record with known code '123456'
        $otp = '123456';
        PasswordResetOtp::create([
            'email' => 'bob@megacommerce.internal',
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'is_used' => false,
        ]);

        // 1. Verify invalid OTP fails
        $badResp = $this->postJson('/api/v1/auth/verify-otp', [
            'email' => 'bob@megacommerce.internal',
            'otp' => '999999',
        ]);
        $badResp->assertStatus(422)->assertJsonValidationErrors(['otp']);

        // 2. Verify valid OTP succeeds and returns reset token
        $goodResp = $this->postJson('/api/v1/auth/verify-otp', [
            'email' => 'bob@megacommerce.internal',
            'otp' => '123456',
        ]);
        $goodResp->assertStatus(200)->assertJson(['status' => 'success']);

        $resetToken = $goodResp->json('data.reset_token');
        $this->assertNotEmpty($resetToken);
        $this->assertEquals(64, strlen($resetToken));

        // 3. Complete password reset
        $resetResp = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'bob@megacommerce.internal',
            'reset_token' => $resetToken,
            'password' => 'BrandNewPassword2026!',
        ]);

        $resetResp->assertStatus(200)->assertJson(['status' => 'success']);

        // 4. Verify user can log in with new password
        $user->refresh();
        $this->assertTrue(Hash::check('BrandNewPassword2026!', $user->password));

        // 5. Verify reset token is single-use and cannot be replayed
        $replayResp = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'bob@megacommerce.internal',
            'reset_token' => $resetToken,
            'password' => 'AnotherPassword2026!',
        ]);
        $replayResp->assertStatus(422)->assertJsonValidationErrors(['token']);
    }
}
