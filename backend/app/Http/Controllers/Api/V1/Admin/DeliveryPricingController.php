<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeliveryPricingController extends Controller
{
    public const DEFAULT_METHODS = [
        [
            'id' => 'standard_express',
            'name' => 'Standard Express (Phnom Penh 1-2h)',
            'name_km' => 'សេវាដឹកជញ្ជូនរហ័ស (ភ្នំពេញ ១-២ ម៉ោង)',
            'price' => 1.50,
            'estimated_time' => '1 - 2 Hours',
            'estimated_time_km' => '១ - ២ ម៉ោង',
            'is_active' => true,
            'is_default' => true,
        ],
        [
            'id' => 'nationwide_provincial',
            'name' => 'Nationwide Provincial Delivery',
            'name_km' => 'សេវាដឹកជញ្ជូនតាមបណ្តាខេត្ត',
            'price' => 2.50,
            'estimated_time' => '24 - 48 Hours',
            'estimated_time_km' => '២៤ - ៤៨ ម៉ោង',
            'is_active' => true,
            'is_default' => false,
        ],
        [
            'id' => 'vip_instant',
            'name' => 'VIP Instant Same-Day Delivery',
            'name_km' => 'សេវាដឹកជញ្ជូន VIP ពិសេសភ្លាមៗ',
            'price' => 3.50,
            'estimated_time' => '30 - 45 Mins',
            'estimated_time_km' => '៣០ - ៤៥ នាទី',
            'is_active' => true,
            'is_default' => false,
        ],
    ];

    /**
     * Get delivery settings and methods (public and admin).
     */
    public function getSettings(): JsonResponse
    {
        $isFree = filter_var(StoreSetting::get('delivery_is_free', true), FILTER_VALIDATE_BOOLEAN);
        $freeThreshold = (float) StoreSetting::get('delivery_free_threshold', 0.0);
        $defaultFee = (float) StoreSetting::get('delivery_default_fee', 0.0);

        $methodsRaw = StoreSetting::get('delivery_methods');
        $methods = ! empty($methodsRaw) ? json_decode($methodsRaw, true) : null;
        if (! is_array($methods) || empty($methods)) {
            $methods = self::DEFAULT_METHODS;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'is_free_delivery' => $isFree,
                'free_delivery_threshold' => $freeThreshold,
                'default_delivery_fee' => $defaultFee,
                'methods' => $methods,
            ],
        ]);
    }

    /**
     * Update global delivery settings (Free delivery toggle & threshold).
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'is_free_delivery' => ['required', 'boolean'],
            'free_delivery_threshold' => ['nullable', 'numeric', 'min:0'],
            'default_delivery_fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        StoreSetting::set('delivery_is_free', $validated['is_free_delivery'] ? '1' : '0');
        if (isset($validated['free_delivery_threshold'])) {
            StoreSetting::set('delivery_free_threshold', (string) $validated['free_delivery_threshold']);
        }
        if (isset($validated['default_delivery_fee'])) {
            StoreSetting::set('delivery_default_fee', (string) $validated['default_delivery_fee']);
        }

        return $this->getSettings();
    }

    /**
     * Quick toggle for Free Delivery on/off.
     */
    public function toggleFreeDelivery(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $current = filter_var(StoreSetting::get('delivery_is_free', true), FILTER_VALIDATE_BOOLEAN);
        $next = $request->has('is_free_delivery')
            ? $request->boolean('is_free_delivery')
            : ! $current;

        StoreSetting::set('delivery_is_free', $next ? '1' : '0');

        return response()->json([
            'status' => 'success',
            'message' => $next ? 'Free delivery enabled globally.' : 'Paid delivery enabled.',
            'data' => [
                'is_free_delivery' => $next,
            ],
        ]);
    }

    /**
     * Add a new delivery method with price.
     */
    public function addMethod(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'name_km' => ['nullable', 'string', 'max:150'],
            'price' => ['required', 'numeric', 'min:0'],
            'estimated_time' => ['nullable', 'string', 'max:60'],
            'estimated_time_km' => ['nullable', 'string', 'max:60'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $methods = $this->loadMethods();

        $newId = 'del_'.strtolower(Str::random(6));
        $isDefault = ! empty($validated['is_default']);

        if ($isDefault) {
            foreach ($methods as &$m) {
                $m['is_default'] = false;
            }
        }

        $newMethod = [
            'id' => $newId,
            'name' => trim($validated['name']),
            'name_km' => ! empty($validated['name_km']) ? trim($validated['name_km']) : trim($validated['name']),
            'price' => round((float) $validated['price'], 2),
            'estimated_time' => $validated['estimated_time'] ?? '1 - 2 Hours',
            'estimated_time_km' => $validated['estimated_time_km'] ?? '១ - ២ ម៉ោង',
            'is_active' => $validated['is_active'] ?? true,
            'is_default' => $isDefault || empty($methods),
        ];

        $methods[] = $newMethod;
        $this->saveMethods($methods);

        return response()->json([
            'status' => 'success',
            'message' => "Delivery method '{$newMethod['name']}' added successfully.",
            'data' => $newMethod,
            'methods' => $methods,
        ], 201);
    }

    /**
     * Update an existing delivery method (price, name, estimated time, active status).
     */
    public function updateMethod(Request $request, string $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'name_km' => ['nullable', 'string', 'max:150'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'estimated_time' => ['nullable', 'string', 'max:60'],
            'estimated_time_km' => ['nullable', 'string', 'max:60'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $methods = $this->loadMethods();
        $found = false;

        if (! empty($validated['is_default'])) {
            foreach ($methods as &$m) {
                $m['is_default'] = false;
            }
        }

        foreach ($methods as &$m) {
            if ($m['id'] === $id) {
                if (isset($validated['name'])) {
                    $m['name'] = trim($validated['name']);
                }
                if (isset($validated['name_km'])) {
                    $m['name_km'] = trim($validated['name_km']);
                }
                if (isset($validated['price'])) {
                    $m['price'] = round((float) $validated['price'], 2);
                }
                if (isset($validated['estimated_time'])) {
                    $m['estimated_time'] = trim($validated['estimated_time']);
                }
                if (isset($validated['estimated_time_km'])) {
                    $m['estimated_time_km'] = trim($validated['estimated_time_km']);
                }
                if (isset($validated['is_active'])) {
                    $m['is_active'] = (bool) $validated['is_active'];
                }
                if (isset($validated['is_default'])) {
                    $m['is_default'] = (bool) $validated['is_default'];
                }
                $found = true;
                break;
            }
        }

        if (! $found) {
            return response()->json([
                'status' => 'error',
                'message' => 'Delivery method not found.',
            ], 404);
        }

        $this->saveMethods($methods);

        return response()->json([
            'status' => 'success',
            'message' => 'Delivery method updated successfully.',
            'methods' => $methods,
        ]);
    }

    /**
     * Delete a delivery method.
     */
    public function deleteMethod(Request $request, string $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $methods = $this->loadMethods();
        $filtered = array_values(array_filter($methods, fn ($m) => $m['id'] !== $id));

        if (count($filtered) === count($methods)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Delivery method not found.',
            ], 404);
        }

        // If default was deleted, assign first available as default
        if (! empty($filtered) && ! array_filter($filtered, fn ($m) => ! empty($m['is_default']))) {
            $filtered[0]['is_default'] = true;
        }

        $this->saveMethods($filtered);

        return response()->json([
            'status' => 'success',
            'message' => 'Delivery method deleted successfully.',
            'methods' => $filtered,
        ]);
    }

    /**
     * Load methods from storage or return default.
     */
    protected function loadMethods(): array
    {
        $raw = StoreSetting::get('delivery_methods');
        if (! empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && ! empty($decoded)) {
                return $decoded;
            }
        }

        return self::DEFAULT_METHODS;
    }

    /**
     * Save methods to storage.
     */
    protected function saveMethods(array $methods): void
    {
        StoreSetting::set('delivery_methods', json_encode(array_values($methods)));
    }

    /**
     * Check authorization.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user('sanctum') ?? $request->user();
        if ($user && ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('STAFF') || $user->hasRole('DELIVERY'))) {
            abort(403, 'Unauthorized. Delivery pricing management requires admin or staff privileges.');
        }
    }
}

