<?php

namespace App\Http\Requests\Auth;

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
    private const DUMMY_HASH = '$argon2id$v=19$m=65536,t=4,p=2$dHVtbXlfc2FsdF9tZWdh$7G5cQ84f5g2jK67l9V1r8X9/8e7g6f5d4c3b2a1';

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

        // Timing-safe check: always perform a hash check even if user doesn't exist
        $hashToCheck = $user ? $user->password : self::DUMMY_HASH;
        $passwordValid = Hash::check($password, $hashToCheck);

        if (! $user || ! $passwordValid) {
            SecurityLogService::log('AUTH_LOGIN_FAILED', $user?->id, [
                'attempted_email' => substr($email, 0, 3).'***@'.(explode('@', $email)[1] ?? 'unknown'),
                'reason' => ! $user ? 'user_not_found' : 'invalid_password',
            ], 'warning');

            // Generic error message to prevent account enumeration
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials provided.'],
            ]);
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
