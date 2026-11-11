<?php

namespace App\Services\Auth;

use App\Models\Role;
use App\Models\SocialAccount;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Security\SecurityLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthService
{
    /**
     * Dynamically resolve Google OAuth configuration from environment or database store settings.
     */
    public function configureSocialite(): void
    {
        $clientId = env('GOOGLE_CLIENT_ID');
        if (! $clientId || $clientId === 'your-google-client-id') {
            try {
                $clientId = StoreSetting::get('google_client_id', '');
            } catch (\Throwable $e) {
                $clientId = '';
            }
        }

        $clientSecret = env('GOOGLE_CLIENT_SECRET');
        if (! $clientSecret || $clientSecret === 'your-google-client-secret') {
            try {
                $clientSecret = StoreSetting::get('google_client_secret', '');
            } catch (\Throwable $e) {
                $clientSecret = '';
            }
        }

        $redirectUri = env('GOOGLE_REDIRECT_URI');
        if (! $redirectUri || str_contains($redirectUri, 'localhost')) {
            $appUrl = env('APP_URL', 'https://api.tyushop.blog');
            $redirectUri = rtrim($appUrl, '/') . '/api/v1/auth/google/callback';
        }

        config([
            'services.google.client_id' => $clientId,
            'services.google.client_secret' => $clientSecret,
            'services.google.redirect' => $redirectUri,
        ]);
    }

    /**
     * Check if Google OAuth credentials are fully provided.
     */
    public function isConfigured(): bool
    {
        $this->configureSocialite();
        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');

        return ! empty($clientId) &&
               ! empty($clientSecret) &&
               $clientId !== 'your-google-client-id' &&
               $clientSecret !== 'your-google-client-secret';
    }

    /**
     * Get redirect URL to Google OAuth provider.
     */
    public function getRedirectUrl(): string
    {
        $this->configureSocialite();

        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');

        if (empty($clientId) || $clientId === 'your-google-client-id' || $clientId === '1234567890-test.apps.googleusercontent.com' || empty($clientSecret) || $clientSecret === 'your-google-client-secret') {
            throw new \RuntimeException('Google OAuth is not configured with valid production credentials yet. Please use the Google sign-in button or configure Google credentials in Admin settings.');
        }

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
        $this->configureSocialite();

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::error("Google OAuth token exchange failed: {$e->getMessage()}");
            throw ValidationException::withMessages([
                'oauth' => ['Google authentication failed: ' . $e->getMessage()],
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
                    'avatar' => $avatar,
                    'roles' => $user->roles->pluck('name'),
                ],
            ];
        });
    }

    /**
     * Authenticate or register a user authenticated via client-side Firebase Google Auth.
     */
    public function handleFirebaseUser(
        ?string $email,
        ?string $name,
        ?string $avatar,
        ?string $googleId,
        ?string $idToken
    ): array {
        if (empty($idToken)) {
            throw ValidationException::withMessages([
                'id_token' => ['A Firebase ID token is required.'],
            ]);
        }

        // Validate the token with Firebase instead of trusting client-supplied email/uid fields.
        $firebaseApiKey = (string) (env('FIREBASE_API_KEY') ?: StoreSetting::get('firebase_api_key', ''));
        if ($firebaseApiKey === '') {
            throw ValidationException::withMessages([
                'id_token' => ['Firebase authentication is not configured on the server.'],
            ]);
        }

        try {
            $lookup = Http::timeout(10)->post(
                'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='.urlencode($firebaseApiKey),
                ['idToken' => $idToken]
            );
        } catch (\Throwable $e) {
            Log::warning('Firebase token verification request failed: '.$e->getMessage());
            throw ValidationException::withMessages([
                'id_token' => ['Firebase authentication could not be verified right now.'],
            ]);
        }

        $firebaseUser = $lookup->json('users.0');
        if (! $lookup->successful() || ! is_array($firebaseUser) || empty($firebaseUser['localId'])) {
            throw ValidationException::withMessages([
                'id_token' => ['Firebase authentication token is invalid or expired.'],
            ]);
        }

        $email = $firebaseUser['email'] ?? $email;
        $name = $firebaseUser['displayName'] ?? $name;
        $avatar = $firebaseUser['photoUrl'] ?? $avatar;
        $googleId = $firebaseUser['localId'];

        if (($firebaseUser['emailVerified'] ?? false) !== true) {
            throw ValidationException::withMessages([
                'email' => ['Your Google email is unverified. Please verify it with Google first.'],
            ]);
        }

        if (empty($email)) {
            throw ValidationException::withMessages([
                'email' => ['Google authentication did not provide a valid email address.'],
            ]);
        }

        $email = strtolower(trim((string) $email));
        $name = trim((string) ($name ?: 'Google User'));
        $googleId = (string) ($googleId ?: ('firebase_' . md5($email)));
        $avatar = (string) ($avatar ?: '');

        // 1. Find or create user by unique email
        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => bin2hex(random_bytes(24)),
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            // Assign customer role if role system exists
            try {
                $customerRole = Role::firstOrCreate(
                    ['slug' => 'customer'],
                    ['name' => 'CUSTOMER', 'description' => 'Standard customer']
                );
                $user->roles()->syncWithoutDetaching([$customerRole->id]);
            } catch (\Throwable $e) {
                // Ignore role attachment if roles table differs
            }
        } else {
            if ($user->email_verified_at === null) {
                $user->email_verified_at = now();
                $user->save();
            }
        }

        // 2. Optionally record social account if table exists
        try {
            if (Schema::hasTable('social_accounts')) {
                SocialAccount::updateOrCreate(
                    ['provider' => 'google', 'provider_id' => $googleId],
                    ['user_id' => $user->id, 'avatar' => $avatar]
                );
            }
        } catch (\Throwable $e) {
            // Ignore social_accounts logging error
        }

        try {
            SecurityLogService::log('AUTH_GOOGLE_FIREBASE_LOGIN', $user->id);
        } catch (\Throwable $e) {
            // ignore
        }

        // Create Sanctum access token
        $token = $user->createToken('google-auth-token')->plainTextToken;

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $avatar,
                'roles' => $user->roles->pluck('name'),
            ],
        ];
    }
}
