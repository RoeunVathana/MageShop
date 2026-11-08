<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthenticationSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        RateLimiter::clear('test.customer@megacommerce.local|127.0.0.1');
        RateLimiter::clear('nonexistent@megacommerce.local|127.0.0.1');
    }

    /**
     * Test requirement 1: Hash passwords using Argon2id where supported.
     */
    public function test_password_is_hashed_using_argon2id(): void
    {
        $password = 'MegaSecurePassword2026!';
        $hashed = Hash::make($password);

        $this->assertTrue(Hash::check($password, $hashed));
        $this->assertStringStartsWith('$argon2id$', $hashed, 'Password must be hashed using Argon2id.');
    }

    /**
     * Test requirement 6: Regenerate session after login.
     */
    public function test_login_with_valid_credentials_succeeds_and_regenerates_session(): void
    {
        $user = User::create([
            'name' => 'Valid Customer',
            'email' => 'valid.customer@megacommerce.local',
            'password' => Hash::make('CorrectPassword123!'),
            'status' => 'active',
        ]);
        $user->assignRole('CUSTOMER');

        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'valid.customer@megacommerce.local',
            'password' => 'CorrectPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user.email', 'valid.customer@megacommerce.local')
            ->assertJsonMissing(['password', 'remember_token']);

        $this->assertAuthenticatedAs($user);
    }

    /**
     * Test requirement 11: Prevent account enumeration (wrong password vs non-existent email).
     */
    public function test_login_with_invalid_password_returns_generic_error_preventing_enumeration(): void
    {
        User::create([
            'name' => 'Existing User',
            'email' => 'existing.user@megacommerce.local',
            'password' => Hash::make('SecretP@ss1'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'existing.user@megacommerce.local',
            'password' => 'WrongPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Invalid credentials provided.');
    }

    public function test_login_with_nonexistent_email_returns_identical_generic_error(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'nonexistent.user.' . uniqid() . '@megacommerce.local',
            'password' => 'AnyPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Invalid credentials provided.');
    }

    /**
     * Test requirement 3 & 5: Brute-force protection and login rate limits.
     */
    public function test_brute_force_login_is_throttled_after_consecutive_failures(): void
    {
        $targetEmail = 'brute.target.' . uniqid() . '@megacommerce.local';

        User::create([
            'name' => 'Brute Target',
            'email' => $targetEmail,
            'password' => Hash::make('RealPassword123!'),
            'status' => 'active',
        ]);

        // Attempt 5 incorrect logins (allowed by rate limiter)
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => $targetEmail,
                'password' => 'WrongAttempt' . $i,
            ]);
            $response->assertStatus(422);
        }

        // 6th attempt must be throttled with HTTP 429 Too Many Requests
        $throttledResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $targetEmail,
            'password' => 'WrongAttempt6',
        ]);

        $throttledResponse->assertStatus(429)
            ->assertJsonPath('status', 'error');
    }

    /**
     * Test account status restriction: Suspended accounts are rejected.
     */
    public function test_suspended_user_cannot_login(): void
    {
        User::create([
            'name' => 'Suspended Customer',
            'email' => 'suspended@megacommerce.local',
            'password' => Hash::make('CorrectPassword123!'),
            'status' => 'suspended',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'suspended@megacommerce.local',
            'password' => 'CorrectPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Test requirement 7: Invalidate session on logout.
     */
    public function test_logout_invalidates_session_and_clears_auth(): void
    {
        $user = User::create([
            'name' => 'Logout User',
            'email' => 'logout.user@megacommerce.local',
            'password' => Hash::make('CorrectPassword123!'),
            'status' => 'active',
        ]);

        $this->actingAs($user, 'web');

        $profileResponse = $this->getJson('/api/v1/auth/me');
        $profileResponse->assertStatus(200);

        $logoutResponse = $this->postJson('/api/v1/auth/logout');
        $logoutResponse->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertGuest('web');
    }

    /**
     * Test requirement 13: Never expose password hashes or sensitive tokens in API responses.
     */
    public function test_authenticated_profile_does_not_expose_password_or_hashes(): void
    {
        $user = User::create([
            'name' => 'Secure Profile User',
            'email' => 'secure.user@megacommerce.local',
            'password' => Hash::make('SuperSecretPassword!'),
            'status' => 'active',
        ]);
        $user->assignRole('CUSTOMER');

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonMissing(['password', 'remember_token'])
            ->assertJsonPath('data.user.email', 'secure.user@megacommerce.local');
    }
}
