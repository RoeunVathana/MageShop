<?php

namespace App\Providers;

use App\Services\Security\SecurityLogService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
            DB::prohibitDestructiveCommands(true);
        }

        $this->configureRateLimiting();
    }

    /**
     * Configure application security rate limiters.
     */
    protected function configureRateLimiting(): void
    {
        // General API rate limiter (60 requests per minute)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user() ? $request->user()->id : $request->ip());
        });

        // Coupon validation rate limiter (prevent brute-force coupon guessing: 20/min per IP)
        RateLimiter::for('coupons', function (Request $request) {
            return Limit::perMinute(20)->by($request->user() ? $request->user()->id : $request->ip());
        });

        // Order tracking rate limiter (prevent order number enumeration: 30/min per IP)
        RateLimiter::for('tracking', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Checkout & Loyalty redemption rate limiter (15/min per user/IP)
        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(15)->by($request->user() ? $request->user()->id : $request->ip());
        });

        // Support chat & ticket submission rate limiter (20/min per IP)
        RateLimiter::for('support', function (Request $request) {
            return Limit::perMinute(20)->by($request->user() ? $request->user()->id : $request->ip());
        });

        // Strict Login Rate Limiter: max 5 attempts/min per user+IP, max 20/min per IP
        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email', ''));
            $throttleKey = Str::transliterate($email.'|'.$request->ip());

            return [
                Limit::perMinute(5)->by($throttleKey)->response(function (Request $request, array $headers) use ($email) {
                    SecurityLogService::log('AUTH_RATE_LIMIT_EXCEEDED', null, [
                        'email_attempt' => $email ? substr($email, 0, 3).'***@'.(explode('@', $email)[1] ?? 'masked') : 'empty',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 'warning');

                    return response()->json([
                        'status' => 'error',
                        'message' => 'Too many login attempts. For security reasons, please wait before trying again.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                }),
                Limit::perMinute(20)->by($request->ip())->response(function (Request $request, array $headers) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Too many authentication attempts originating from your network.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                }),
            ];
        });
    }
}
