<?php

namespace App\Services\Auth;

use App\Models\Role;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthService
{
    /**
     * Get redirect URL to Google OAuth provider.
     */
    public function getRedirectUrl(): string
    {
        return Socialite::driver('google')
            ->stateless()
            ->scopes(['openid', 'profile', 'email'])
            ->redirect()
            ->getTargetUrl();
    }

    /**
     * Handle incoming Google OAuth callback.
     */
    public function handleCallback(?string $code = null): array
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::error("Google OAuth token exchange failed: {$e->getMessage()}");
            throw ValidationException::withMessages([
                'oauth' => ['Google authentication failed or was cancelled by user.'],
            ]);
        }

        $googleId = (string) $googleUser->getId();
        $email = strtolower((string) $googleUser->getEmail());
        $name = (string) ($googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User');
        $avatar = (string) $googleUser->getAvatar();

        if (empty($email)) {
            throw ValidationException::withMessages([
                'oauth' => ['Google did not provide an email address for authentication.'],
            ]);
        }

        // Check if raw data marks email as verified
        $raw = $googleUser->getRaw();
        $isEmailVerified = $raw['email_verified'] ?? true;

        if (! $isEmailVerified) {
            throw ValidationException::withMessages([
                'oauth' => ['Your Google email is unverified. Please verify your email with Google first.'],
            ]);
        }

        return DB::transaction(function () use ($googleId, $email, $name, $avatar) {
            // 1. Check existing social account
            $socialAccount = SocialAccount::where('provider', 'google')
                ->where('provider_id', $googleId)
                ->first();

            $user = null;

            if ($socialAccount) {
                $user = $socialAccount->user;
            } else {
                // 2. Check if user with this email already exists
                $user = User::where('email', $email)->first();

                if (! $user) {
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'password' => bin2hex(random_bytes(24)),
                        'status' => 'active',
                        'email_verified_at' => now(),
                    ]);

                    // Assign customer role
                    $customerRole = Role::firstOrCreate(
                        ['slug' => 'customer'],
                        ['name' => 'CUSTOMER', 'description' => 'Standard customer']
                    );
                    $user->roles()->attach($customerRole->id);
                } else {
                    // Mark verified if not yet marked
                    if ($user->email_verified_at === null) {
                        $user->email_verified_at = now();
                        $user->save();
                    }
                }

                // Create social account record
                SocialAccount::create([
                    'user_id' => $user->id,
                    'provider' => 'google',
                    'provider_id' => $googleId,
                    'avatar' => $avatar,
                ]);
            }

            // Create Sanctum access token
            $token = $user->createToken('google-auth-token')->plainTextToken;

            return [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name'),
                ],
            ];
        });
    }
}
