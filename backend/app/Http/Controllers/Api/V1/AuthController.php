<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\GoogleAuthService;
use App\Services\Auth\PasswordResetOtpService;
use App\Services\Security\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Customer registration.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => strtolower(trim($validated['email'])),
                'phone_number' => $validated['phone_number'] ?? null,
                'password' => $validated['password'], // hashed via User cast with Argon2id
                'status' => 'active',
                'email_verified_at' => now(), // instant verification for demo or queued email verification
            ]);

            // Assign default CUSTOMER role
            $customerRole = Role::firstOrCreate(
                ['slug' => 'customer'],
                ['name' => 'CUSTOMER', 'description' => 'Standard customer']
            );
            $user->roles()->attach($customerRole->id);

            return $user;
        });

        SecurityLogService::log('AUTH_REGISTRATION_SUCCESS', $user->id, [
            'email' => $user->email,
            'ip' => $request->ip(),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Registration completed successfully.',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'status' => $user->status,
                    'roles' => $user->roles()->select('roles.id', 'roles.name', 'roles.slug')->get(),
                ],
            ],
        ], 201);
    }

    /**
     * Authenticate user via Sanctum cookie-based session with brute-force protection.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $request->authenticate();

        // Regenerate session ID to mitigate session fixation attacks
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Authenticated successfully.',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'status' => $user->status,
                    'roles' => $user->roles()->select('roles.id', 'roles.name', 'roles.slug')->get(),
                ],
            ],
        ], 200);
    }

    /**
     * Terminate the authenticated session and purge session cookies.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            SecurityLogService::log('AUTH_LOGOUT', $user->id);

            // Revoke Sanctum tokens if a persistent personal access token is used
            if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken() instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $user->currentAccessToken()->delete();
            }
        }

        // Invalidate web session and regenerate CSRF token
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully. Session invalidated.',
        ], 200);
    }

    /**
     * Invalidate all other active sessions/devices for the authenticated user.
     */
    public function logoutAllDevices(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Clear all session records in the database except the current one
        if (config('session.driver') === 'database' && $request->hasSession()) {
            $currentSessionId = $request->session()->getId();
            DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->where('id', '!=', $currentSessionId)
                ->delete();
        }

        // Also revoke all other Sanctum personal access tokens if any exist
        if (method_exists($user, 'tokens')) {
            $currentTokenId = $user->currentAccessToken()?->id;
            if ($currentTokenId) {
                $user->tokens()->where('id', '!=', $currentTokenId)->delete();
            } else {
                $user->tokens()->delete();
            }
        }

        SecurityLogService::log('AUTH_LOGOUT_ALL_DEVICES', $user->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Successfully terminated all other active sessions.',
        ], 200);
    }

    /**
     * Return authenticated user profile and roles (sanitized).
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'status' => $user->status,
                    'email_verified_at' => $user->email_verified_at,
                    'roles' => $user->roles()->select('roles.id', 'roles.name', 'roles.slug')->with('permissions:permissions.id,permissions.name,permissions.slug')->get(),
                ],
            ],
        ], 200);
    }

    /**
     * Request 6-digit Email OTP for password recovery.
     */
    public function forgotPassword(Request $request, PasswordResetOtpService $otpService): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $otpService->sendOtp($validated['email']);

        // Return generic message to prevent account enumeration
        return response()->json([
            'status' => 'success',
            'message' => 'If this email is registered, a 6-digit recovery code has been sent.',
        ]);
    }

    /**
     * Verify 6-digit OTP code and retrieve short-lived reset token.
     */
    public function verifyOtp(Request $request, PasswordResetOtpService $otpService): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $resetToken = $otpService->verifyOtp($validated['email'], $validated['otp']);

        return response()->json([
            'status' => 'success',
            'message' => 'Verification code confirmed.',
            'data' => [
                'reset_token' => $resetToken,
            ],
        ]);
    }

    /**
     * Set new password using verified reset token.
     */
    public function resetPassword(Request $request, PasswordResetOtpService $otpService): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'reset_token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()],
        ]);

        $otpService->resetPassword($validated['email'], $validated['reset_token'], $validated['password']);

        return response()->json([
            'status' => 'success',
            'message' => 'Your password has been reset successfully. Please log in with your new password.',
        ]);
    }

    /**
     * Redirect to Google OAuth provider.
     */
    public function googleRedirect(GoogleAuthService $googleService): JsonResponse|RedirectResponse
    {
        $url = $googleService->getRedirectUrl();

        if (request()->wantsJson()) {
            return response()->json(['url' => $url]);
        }

        return redirect()->away($url);
    }

    /**
     * Handle Google OAuth callback.
     */
    public function googleCallback(Request $request, GoogleAuthService $googleService): JsonResponse|RedirectResponse
    {
        $result = $googleService->handleCallback($request->query('code'));

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        }

        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        return redirect()->to("{$frontendUrl}/login?token={$result['token']}");
    }
}
