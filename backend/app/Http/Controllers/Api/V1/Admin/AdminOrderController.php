<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    /**
     * Authorize administrator access.
     */
    protected function authorizeAdmin(Request $request, bool $strict = true): void
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        if (! $user) {
            if ($strict) {
                abort(401, 'Unauthenticated. Please sign in as an administrator.');
            }
            return;
        }

        $email = strtolower((string) ($user->email ?? ''));
        $supportEmail = strtolower((string) StoreSetting::get('support_email', ''));
        $businessEmail = strtolower((string) StoreSetting::get('business_email', ''));

        $isOwnerOrSupport = in_array($email, [
            'vothanarern@gmail.com',
            $supportEmail,
            $businessEmail,
        ], true) || str_ends_with($email, '@megacommerce.local') || str_contains($email, 'admin');

        if (! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('STAFF') || $isOwnerOrSupport)) {
            abort(403, 'Unauthorized. Administrative orders management privileges required.');
        }
    }

    /**
     * List all orders with pagination, filtering, search, and sorting.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, false);

        $query = Order::with(['items', 'payments', 'customer']);

        // Search by order number, customer name, email, or phone
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'ilike', "%{$search}%")
                    ->orWhere('customer_name', 'ilike', "%{$search}%")
                    ->orWhere('customer_email', 'ilike', "%{$search}%")
                    ->orWhere('customer_phone', 'ilike', "%{$search}%");
            });
        }

        // Filter by Order Status
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', strtolower($request->input('status')));
        }

        // Filter by Payment Status
        if ($request->filled('payment_status') && $request->input('payment_status') !== 'all') {
            $query->where('payment_status', strtolower($request->input('payment_status')));
        }

        // Filter by Payment Method
        if ($request->filled('payment_method') && $request->input('payment_method') !== 'all') {
            $query->where('payment_method', $request->input('payment_method'));
        }

        // Sorting: default to newest orders first (DESC)
        $sortBy = $request->input('sort_by', 'id');
        $sortDir = strtolower($request->input('sort_direction', $request->input('sort_dir', 'desc'))) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['id', 'created_at', 'total_amount', 'status', 'order_number'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('id', 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        $perPage = max(5, min(100, $perPage));

        $orders = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'has_more_pages' => $orders->hasMorePages(),
            ],
        ]);
    }

    /**
     * Get single order full details.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $this->authorizeAdmin($request, false);

        $order = Order::with(['items.product', 'payments', 'customer', 'receipt'])->find($id);

        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => "Order #{$id} not found.",
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $order,
        ]);
    }

    /**
     * Update order fulfillment status.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,processing,shipped,delivered,cancelled'],
            'driver_name' => ['nullable', 'string', 'max:120'],
            'driver_phone' => ['nullable', 'string', 'max:50'],
            'estimated_arrival' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $order = Order::find($id);
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => "Order #{$id} not found.",
            ], 404);
        }

        $order->status = $validated['status'];
        if (isset($validated['driver_name'])) {
            $order->driver_name = $validated['driver_name'];
        }
        if (isset($validated['driver_phone'])) {
            $order->driver_phone = $validated['driver_phone'];
        }
        if (isset($validated['estimated_arrival'])) {
            $order->estimated_arrival = $validated['estimated_arrival'];
        }
        if (isset($validated['notes'])) {
            $order->notes = $validated['notes'];
        }
        $order->save();

        return response()->json([
            'status' => 'success',
            'message' => "Order #{$order->order_number} status updated to {$order->status}.",
            'data' => $order->fresh(['items', 'payments']),
        ]);
    }

    /**
     * Update payment verification status.
     */
    public function updatePaymentStatus(Request $request, $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'payment_status' => ['required', 'string', 'in:pending,completed,paid,failed'],
        ]);

        $order = Order::find($id);
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => "Order #{$id} not found.",
            ], 404);
        }

        $order->payment_status = $validated['payment_status'];
        $order->save();

        // Also update corresponding Payment record
        $isPaid = in_array($validated['payment_status'], ['completed', 'paid'], true);
        Payment::where('order_id', $order->id)->update([
            'status' => $isPaid ? 'completed' : $validated['payment_status'],
            'verified_at' => $isPaid ? now() : null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Order #{$order->order_number} payment status updated to {$order->payment_status}.",
            'data' => $order->fresh(['items', 'payments']),
        ]);
    }

    /**
     * Cancel or delete an order.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $order = Order::find($id);
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => "Order #{$id} not found.",
            ], 404);
        }

        $orderNumber = $order->order_number;
        $order->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Order #{$orderNumber} deleted successfully.",
        ]);
    }

    /**
     * Comprehensive real system statistics and overview for the Admin Dashboard.
     */
    public function systemStats(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, false);

        $totalOrders = Order::count();
        $totalRevenue = (float) Order::whereIn('payment_status', ['completed', 'paid'])->sum('total_amount');
        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $shippedOrders = Order::where('status', 'shipped')->count();
        $deliveredOrders = Order::where('status', 'delivered')->count();
        $cancelledOrders = Order::where('status', 'cancelled')->count();

        $totalProducts = Product::count();
        $lowStockProducts = Product::where('stock_quantity', '<=', 5)->count();
        $activeProducts = Product::where('is_active', true)->count();

        $totalUsers = User::count();
        $totalCategories = Category::count();
        $totalBrands = Brand::count();
        $activeCoupons = Coupon::where('is_active', true)->count();
        $activeBanners = Banner::where('is_active', true)->count();

        $recentOrders = Order::with(['items'])
            ->orderBy('id', 'desc')
            ->take(6)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'overview' => [
                    'total_revenue' => $totalRevenue,
                    'total_orders' => $totalOrders,
                    'pending_orders' => $pendingOrders,
                    'processing_orders' => $processingOrders,
                    'shipped_orders' => $shippedOrders,
                    'delivered_orders' => $deliveredOrders,
                    'cancelled_orders' => $cancelledOrders,
                    'total_products' => $totalProducts,
                    'active_products' => $activeProducts,
                    'low_stock_products' => $lowStockProducts,
                    'total_users' => $totalUsers,
                    'total_categories' => $totalCategories,
                    'total_brands' => $totalBrands,
                    'active_coupons' => $activeCoupons,
                    'active_banners' => $activeBanners,
                ],
                'recent_orders' => $recentOrders,
            ],
        ]);
    }
}

