<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class CouponController extends Controller
{
    /**
     * Check if user is authorized to manage coupons (Admin or Seller).
     */
    private function isAuthorizedToManage(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $email = strtolower($user->email ?? '');
        if (in_array($email, ['vothanarern@gmail.com', 'admin@megacommerce.com'], true)) {
            return true;
        }

        return $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'SELLER', 'SELLER_STAFF'])
            || $user->hasPermission('coupons.manage');
    }

    /**
     * List all coupons for Admin & Seller Management.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?: $request->user();
        if (! $this->isAuthorizedToManage($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Only Administrators and Sellers can manage discount coupons.',
            ], 403);
        }

        $query = Coupon::query();

        // Search by code or description
        if ($search = $request->input('search')) {
            $search = trim($search);
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        // Filter by discount type
        if ($type = $request->input('discount_type')) {
            if (in_array($type, ['percentage', 'fixed'], true)) {
                $query->where('discount_type', $type);
            }
        }

        // Filter by status (active / inactive)
        if ($request->has('is_active') && $request->input('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // Optional filter: seller only sees own coupons if requested
        $sellerOnly = filter_var($request->input('seller_only', false), FILTER_VALIDATE_BOOLEAN);
        if ($sellerOnly && $user && Schema::hasColumn('coupons', 'created_by')) {
            $query->where('created_by', $user->id);
        }

        $coupons = $query->orderBy('is_active', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'ok',
            'data' => $coupons,
            'meta' => [
                'total' => $coupons->count(),
                'active_count' => $coupons->where('is_active', true)->count(),
                'inactive_count' => $coupons->where('is_active', false)->count(),
            ],
        ]);
    }

    /**
     * Create a new promotional discount coupon (Admin or Seller).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?: $request->user();
        if (! $this->isAuthorizedToManage($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Only Administrators and Sellers can create coupons.',
            ], 403);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-]+$/', 'unique:coupons,code'],
            'description' => ['nullable', 'string', 'max:255'],
            'discount_type' => ['required', 'in:percentage,fixed'],
            'discount_value' => ['required', 'numeric', 'min:0.01'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $code = strtoupper(trim($validated['code']));
        $discountType = $validated['discount_type'];
        $discountValue = (float) $validated['discount_value'];

        if ($discountType === 'percentage' && $discountValue > 100) {
            return response()->json([
                'status' => 'error',
                'message' => 'Percentage discount cannot exceed 100%.',
                'errors' => ['discount_value' => ['Percentage discount cannot exceed 100%.']],
            ], 422);
        }

        $couponData = [
            'code' => $code,
            'description' => $validated['description'] ?? null,
            'discount_type' => $discountType,
            'discount_value' => $discountValue,
            'min_order_amount' => isset($validated['min_order_amount']) ? (float) $validated['min_order_amount'] : 0.00,
            'max_discount_amount' => isset($validated['max_discount_amount']) && $validated['max_discount_amount'] !== null
                ? (float) $validated['max_discount_amount']
                : null,
            'is_active' => isset($validated['is_active']) ? (bool) $validated['is_active'] : true,
            'expires_at' => ! empty($validated['expires_at']) ? $validated['expires_at'] : null,
        ];

        if (Schema::hasColumn('coupons', 'created_by') && $user) {
            $couponData['created_by'] = $user->id;
        }

        $coupon = Coupon::create($couponData);

        return response()->json([
            'status' => 'ok',
            'message' => "Coupon '{$coupon->code}' created successfully.",
            'data' => $coupon,
        ], 201);
    }

    /**
     * Show a single coupon details.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user('sanctum') ?: $request->user();
        if (! $this->isAuthorizedToManage($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 403);
        }

        $coupon = Coupon::find($id);
        if (! $coupon) {
            return response()->json([
                'status' => 'error',
                'message' => "Coupon #{$id} not found.",
            ], 404);
        }

        return response()->json([
            'status' => 'ok',
            'data' => $coupon,
        ]);
    }

    /**
     * Update an existing coupon (Admin or Seller).
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = $request->user('sanctum') ?: $request->user();
        if (! $this->isAuthorizedToManage($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Only Administrators and Sellers can update coupons.',
            ], 403);
        }

        $coupon = Coupon::find($id);
        if (! $coupon) {
            return response()->json([
                'status' => 'error',
                'message' => "Coupon #{$id} not found.",
            ], 404);
        }

        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-]+$/', Rule::unique('coupons', 'code')->ignore($coupon->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'discount_type' => ['sometimes', 'required', 'in:percentage,fixed'],
            'discount_value' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        if (isset($validated['code'])) {
            $coupon->code = strtoupper(trim($validated['code']));
        }
        if (array_key_exists('description', $validated)) {
            $coupon->description = $validated['description'];
        }
        if (isset($validated['discount_type'])) {
            $coupon->discount_type = $validated['discount_type'];
        }
        if (isset($validated['discount_value'])) {
            $val = (float) $validated['discount_value'];
            if ($coupon->discount_type === 'percentage' && $val > 100) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Percentage discount cannot exceed 100%.',
                    'errors' => ['discount_value' => ['Percentage discount cannot exceed 100%.']],
                ], 422);
            }
            $coupon->discount_value = $val;
        }
        if (array_key_exists('min_order_amount', $validated)) {
            $coupon->min_order_amount = $validated['min_order_amount'] !== null ? (float) $validated['min_order_amount'] : 0.00;
        }
        if (array_key_exists('max_discount_amount', $validated)) {
            $coupon->max_discount_amount = $validated['max_discount_amount'] !== null ? (float) $validated['max_discount_amount'] : null;
        }
        if (array_key_exists('is_active', $validated)) {
            $coupon->is_active = (bool) $validated['is_active'];
        }
        if (array_key_exists('expires_at', $validated)) {
            $coupon->expires_at = ! empty($validated['expires_at']) ? $validated['expires_at'] : null;
        }

        $coupon->save();

        return response()->json([
            'status' => 'ok',
            'message' => "Coupon '{$coupon->code}' updated successfully.",
            'data' => $coupon,
        ]);
    }

    /**
     * Delete a coupon permanently.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user('sanctum') ?: $request->user();
        if (! $this->isAuthorizedToManage($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Only Administrators and Sellers can delete coupons.',
            ], 403);
        }

        $coupon = Coupon::find($id);
        if (! $coupon) {
            return response()->json([
                'status' => 'error',
                'message' => "Coupon #{$id} not found.",
            ], 404);
        }

        $code = $coupon->code;
        $coupon->delete();

        return response()->json([
            'status' => 'ok',
            'message' => "Coupon '{$code}' has been permanently deleted.",
        ]);
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleActive(Request $request, $id): JsonResponse
    {
        $user = $request->user('sanctum') ?: $request->user();
        if (! $this->isAuthorizedToManage($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 403);
        }

        $coupon = Coupon::find($id);
        if (! $coupon) {
            return response()->json([
                'status' => 'error',
                'message' => "Coupon #{$id} not found.",
            ], 404);
        }

        $coupon->is_active = ! $coupon->is_active;
        $coupon->save();

        $statusText = $coupon->is_active ? 'Active' : 'Inactive';

        return response()->json([
            'status' => 'ok',
            'message' => "Coupon '{$coupon->code}' is now {$statusText}.",
            'data' => $coupon,
        ]);
    }
}
