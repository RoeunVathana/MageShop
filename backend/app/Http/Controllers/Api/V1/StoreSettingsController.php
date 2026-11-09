<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class StoreSettingsController extends Controller
{
    /**
     * Get public store settings.
     */
    public function show(): JsonResponse
    {
        $all = StoreSetting::getAll();

        $publicKeys = [
            'store_name',
            'store_description',
            'store_address',
            'company_city',
            'company_country',
            'company_postal_code',
            'company_latitude',
            'company_longitude',
            'company_map_embed_url',
            'company_google_maps_url',
            'business_hours',
            'contact_phone',
            'support_email',
            'business_email',
            'website_url',
            'default_currency',
            'usd_to_khr_rate',
            'allowed_currencies',
            'currency_auto_switch_lang',
            'country',
            'supported_languages',
            'brand_color',
            'return_policy_days',
            'shipping_policy',
            'tax_id',
            'telegram_bot_username',
            'telegram_support_contact',
            'loyalty_free_item_max_price',
            'loyalty_points_for_free_item',
        ];

        $publicSettings = array_intersect_key($all, array_flip($publicKeys));

        // Default Company Location & Details
        if (! isset($publicSettings['store_address']) || empty($publicSettings['store_address'])) {
            $publicSettings['store_address'] = 'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh, Cambodia';
        }
        if (! isset($publicSettings['company_city']) || empty($publicSettings['company_city'])) {
            $publicSettings['company_city'] = 'Phnom Penh';
        }
        if (! isset($publicSettings['company_country']) || empty($publicSettings['company_country'])) {
            $publicSettings['company_country'] = 'Cambodia';
        }
        if (! isset($publicSettings['company_latitude']) || empty($publicSettings['company_latitude'])) {
            $publicSettings['company_latitude'] = '11.5564';
        }
        if (! isset($publicSettings['company_longitude']) || empty($publicSettings['company_longitude'])) {
            $publicSettings['company_longitude'] = '104.9282';
        }
        if (! isset($publicSettings['business_hours']) || empty($publicSettings['business_hours'])) {
            $publicSettings['business_hours'] = 'Mon - Sun: 8:00 AM - 10:00 PM (24/7 Support Desk)';
        }
        if (! isset($publicSettings['company_google_maps_url']) || empty($publicSettings['company_google_maps_url'])) {
            $lat = $publicSettings['company_latitude'];
            $lng = $publicSettings['company_longitude'];
            $publicSettings['company_google_maps_url'] = "https://maps.google.com/?q={$lat},{$lng}";
        }

        // Intelligent currency defaults
        if (! isset($publicSettings['default_currency']) || empty($publicSettings['default_currency'])) {
            $publicSettings['default_currency'] = 'USD';
        }
        if (! isset($publicSettings['usd_to_khr_rate']) || empty($publicSettings['usd_to_khr_rate'])) {
            $publicSettings['usd_to_khr_rate'] = '4100';
        }
        if (! isset($publicSettings['allowed_currencies']) || empty($publicSettings['allowed_currencies'])) {
            $publicSettings['allowed_currencies'] = 'BOTH';
        }
        if (! isset($publicSettings['currency_auto_switch_lang'])) {
            $publicSettings['currency_auto_switch_lang'] = 'false';
        }

        return response()->json([
            'status' => 'success',
            'data' => $publicSettings,
        ]);
    }

    /**
     * Get all store settings for administrative management.
     */
    public function adminShow(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $all = StoreSetting::getAll();

        // Ensure currency settings are present
        if (! isset($all['default_currency'])) {
            $all['default_currency'] = 'USD';
        }
        if (! isset($all['usd_to_khr_rate'])) {
            $all['usd_to_khr_rate'] = '4100';
        }
        if (! isset($all['allowed_currencies'])) {
            $all['allowed_currencies'] = 'BOTH';
        }
        if (! isset($all['currency_auto_switch_lang'])) {
            $all['currency_auto_switch_lang'] = 'false';
        }

        // Google OAuth Settings & Callback Helper
        $appUrl = env('APP_URL', 'https://api.tyushop.blog');
        $all['google_callback_url'] = env('GOOGLE_REDIRECT_URI') ?: (rtrim($appUrl, '/') . '/api/v1/auth/google/callback');
        $all['google_client_id'] = $all['google_client_id'] ?? (env('GOOGLE_CLIENT_ID') !== 'your-google-client-id' ? env('GOOGLE_CLIENT_ID') : '');
        $all['google_is_configured'] = ! empty($all['google_client_id']) && ! empty($all['google_client_secret'] ?? env('GOOGLE_CLIENT_SECRET'));

        return response()->json([
            'status' => 'success',
            'data' => $all,
        ]);
    }

    /**
     * Update store settings.
     */
    public function update(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'store_name' => 'nullable|string|max:100',
            'store_description' => 'nullable|string|max:500',
            'store_address' => 'nullable|string|max:255',
            'company_city' => 'nullable|string|max:100',
            'company_country' => 'nullable|string|max:100',
            'company_postal_code' => 'nullable|string|max:20',
            'company_latitude' => 'nullable|numeric|between:-90,90',
            'company_longitude' => 'nullable|numeric|between:-180,180',
            'company_map_embed_url' => 'nullable|string|max:1500',
            'company_google_maps_url' => 'nullable|string|max:1000',
            'business_hours' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'support_email' => 'nullable|email|max:100',
            'business_email' => 'nullable|email|max:100',
            'default_currency' => 'nullable|string|in:USD,KHR',
            'usd_to_khr_rate' => 'nullable|numeric|min:1|max:100000',
            'allowed_currencies' => 'nullable|string|in:BOTH,USD_ONLY,KHR_ONLY,USD,KHR',
            'currency_auto_switch_lang' => 'nullable|string|max:10',
            'brand_color' => 'nullable|string|max:20',
            'return_policy_days' => 'nullable|numeric|min:0|max:90',
            'shipping_policy' => 'nullable|string|max:1000',
            'tax_id' => 'nullable|string|max:50',
            'receipt_footer_message' => 'nullable|string|max:500',
            'google_client_id' => 'nullable|string|max:255',
            'google_client_secret' => 'nullable|string|max:255',
            'google_auth_enabled' => 'nullable|string|max:10',
            'loyalty_free_item_max_price' => 'nullable|numeric|min:1|max:500',
            'loyalty_points_for_free_item' => 'nullable|integer|min:1|max:1000',
        ]);

        foreach ($validated as $key => $value) {
            if ($value !== null) {
                StoreSetting::set($key, (string) $value);
            }
        }

        Cache::forget('store_settings:all');
        Cache::forget('megacommerce_all_store_settings');

        return response()->json([
            'status' => 'success',
            'message' => 'Store currency and settings updated successfully.',
            'data' => StoreSetting::getAll(),
        ]);
    }

    protected function authorizeAdmin(Request $request): void
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $email = strtolower((string) ($user->email ?? ''));
        $supportEmail = strtolower((string) StoreSetting::get('support_email', ''));
        $businessEmail = strtolower((string) StoreSetting::get('business_email', ''));

        $isOwnerOrSupport = in_array($email, [
            'vothanarern@gmail.com',
            $supportEmail,
            $businessEmail,
        ], true) || str_ends_with($email, '@megacommerce.local') || str_contains($email, 'admin');

        if ($isOwnerOrSupport && method_exists($user, 'assignRole') && ! $user->hasRole('SUPER_ADMIN')) {
            try {
                $user->assignRole('SUPER_ADMIN');
                $user->assignRole('ADMIN');
            } catch (\Throwable $e) {
                // Ignore if roles table is locked or role assignment already exists
            }
        }

        if (! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('STAFF') || $isOwnerOrSupport)) {
            abort(403, 'Unauthorized. Administrative permissions required.');
        }
    }
}
