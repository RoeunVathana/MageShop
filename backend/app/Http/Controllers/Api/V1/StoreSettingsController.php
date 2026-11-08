<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'contact_phone',
            'support_email',
            'business_email',
            'website_url',
            'default_currency',
            'country',
            'supported_languages',
            'brand_color',
            'return_policy_days',
            'shipping_policy',
            'telegram_bot_username',
            'telegram_support_contact',
        ];

        $publicSettings = array_intersect_key($all, array_flip($publicKeys));

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

        return response()->json([
            'status' => 'success',
            'data' => StoreSetting::getAll(),
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
            'contact_phone' => 'nullable|string|max:50',
            'support_email' => 'nullable|email|max:100',
            'business_email' => 'nullable|email|max:100',
            'default_currency' => 'nullable|string|size:3',
            'brand_color' => 'nullable|string|max:20',
            'return_policy_days' => 'nullable|numeric|min:0|max:90',
            'shipping_policy' => 'nullable|string|max:1000',
            'tax_id' => 'nullable|string|max:50',
            'receipt_footer_message' => 'nullable|string|max:500',
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
            'message' => 'Store settings updated successfully.',
            'data' => StoreSetting::getAll(),
        ]);
    }

    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('STAFF'))) {
            abort(403, 'Unauthorized. Administrative permissions required.');
        }
    }
}
