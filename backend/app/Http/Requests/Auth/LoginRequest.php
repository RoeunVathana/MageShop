<?php

namespace App\Http\Requests\Auth;

use App\Models\Role;
use App\Models\User;
use App\Services\Security\SecurityLogService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Constant fake hash to prevent timing attacks when an account does not exist.
     */
    private const DUMMY_HASH = '$2y$12$e8x/kG2Fk4rR3n2M1l5P7u/KjO9Q8W7E6R5T4Y3U2I1O0P9A8S7D6';

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials with anti-enumeration and timing protection.
     *
     * @throws ValidationException
     */
    public function authenticate(): User
    {
        $email = Str::lower((string) $this->input('email'));
        $password = (string) $this->input('password');

        $user = User::where('email', $email)->first();

        // Optional first-admin bootstrap. Keep credentials in Railway environment variables,
        // never in source control. Leave both variables unset after provisioning.
        $masterEmail = Str::lower((string) env('MASTER_ADMIN_EMAIL', ''));
        $masterPassword = (string) env('MASTER_ADMIN_PASSWORD', '');
        if ($masterEmail !== '' && $masterPassword !== '' && $email === $masterEmail && hash_equals($masterPassword, $password)) {
            if (! $user) {
                try {
                    $user = User::create([
                        'name' => env('MASTER_ADMIN_NAME', 'Platform Administrator'),
                        'email' => $masterEmail,
                        'password' => Hash::make($masterPassword),
                        'status' => 'active',
                        'email_verified_at' => now(),
                    ]);
                } catch (\Throwable $e) {
                    $user = User::where('email', $email)->first();
                }
            } else {
                if (! Hash::check($masterPassword, $user->password) || $user->status !== 'active') {
                    $user->password = Hash::make($masterPassword);
                    $user->status = 'active';
                    $user->save();
                }
            }

            if ($user) {
                try {
                    $superAdminRole = Role::firstOrCreate(['slug' => 'super_admin'], ['name' => 'SUPER_ADMIN']);
                    $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'ADMIN']);
                    $user->roles()->syncWithoutDetaching([$superAdminRole->id, $adminRole->id]);
                } catch (\Throwable $e) {
                    // ignore
                }
            }

            $passwordValid = true;
        } else {
            // Timing-safe check: always perform a hash check even if user doesn't exist
            $hashToCheck = $user ? $user->password : self::DUMMY_HASH;
            try {
                $passwordValid = Hash::check($password, $hashToCheck);
            } catch (\Throwable $e) {
                $passwordValid = @password_verify($password, $hashToCheck);
            }
        }

        if (! $user || ! $passwordValid) {
            SecurityLogService::log('AUTH_LOGIN_FAILED', $user ? $user->id : null, [
                'attempted_email' => substr($email, 0, 3).'***@'.(explode('@', $email)[1] ?? 'unknown'),
                'reason' => ! $user ? 'user_not_found' : 'invalid_password',
            ], 'warning');

            // Generic error message to prevent account enumeration
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided.'],
            ]);
        }

        // Auto-rehash password to current bcrypt configuration if needed
        try {
            if ($user && $passwordValid && Hash::needsRehash($user->password)) {
                $user->password = $password;
                $user->save();
            }
        } catch (\Throwable $rehashEx) {
            // Silently continue if rehash fails
        }

        // Check account status
        if ($user->status !== 'active') {
            SecurityLogService::log('AUTH_SUSPENDED_ACCOUNT_ATTEMPT', $user->id, [
                'status' => $user->status,
            ], 'warning');

            throw ValidationException::withMessages([
                'email' => ['Your account is currently '.$user->status.'. Please contact customer support.'],
            ]);
        }

        // Complete standard Laravel session login with remember option
        Auth::guard('web')->login($user, $this->boolean('remember'));

        // Clear rate limiter upon successful authentication
        $throttleKey = Str::transliterate($email.'|'.$this->ip());
        RateLimiter::clear($throttleKey);

        SecurityLogService::log('AUTH_LOGIN_SUCCESS', $user->id, [
            'roles' => $user->roles()->pluck('name')->toArray(),
        ]);

        return $user;
    }
}
