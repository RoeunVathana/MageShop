<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OperationsController extends Controller
{
    private const OPERATIONS_ROLES = [
        'SUPER_ADMIN',
        'ADMIN',
        'STAFF',
        'ORDER_MANAGER',
        'CUSTOMER_SUPPORT',
        'LOGISTICS_MANAGER',
        'DISPATCHER',
    ];

    public function staffOverview(Request $request): JsonResponse
    {
        $this->authorizeRoles($request, self::OPERATIONS_ROLES);

        $openTickets = Schema::hasTable('support_tickets')
            ? DB::table('support_tickets')->whereIn('status', ['open', 'in_progress'])->count()
            : 0;

        $queue = Order::with(['items', 'driver:id,name,phone_number'])
            ->whereIn('status', ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'])
            ->latest('created_at')
            ->limit(12)
            ->get();

        $drivers = $this->driversQuery()->get()->map(function (User $driver) {
            return [
                'id' => $driver->id,
                'name' => $driver->name,
                'email' => $driver->email,
                'phone_number' => $driver->phone_number,
                'status' => $driver->status,
                'roles' => $driver->roles->pluck('name')->values(),
                'assigned_orders_count' => (int) ($driver->assigned_orders_count ?? 0),
            ];
        })->values();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'stats' => [
                    'pending_orders' => Order::whereIn('status', ['pending', 'confirmed'])->count(),
                    'processing_orders' => Order::whereIn('status', ['processing', 'shipped', 'out_for_delivery'])->count(),
                    'open_tickets' => $openTickets,
                    'low_stock_products' => Product::where('is_active', true)
                        ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                        ->count(),
                    'active_products' => Product::where('is_active', true)->count(),
                    'delivered_today' => Order::where('status', 'delivered')
                        ->whereDate('updated_at', now()->toDateString())
                        ->count(),
                    'pending_seller_applications' => SellerApplication::where('status', 'pending')->count(),
                ],
                'queue' => $queue,
                'drivers' => $drivers,
            ],
        ]);
    }

    public function drivers(Request $request): JsonResponse
    {
        $this->authorizeRoles($request, self::OPERATIONS_ROLES);

        return response()->json([
            'status' => 'ok',
            'data' => $this->driversQuery()->get()->map(function (User $driver) {
                return [
                    'id' => $driver->id,
                    'name' => $driver->name,
                    'email' => $driver->email,
                    'phone_number' => $driver->phone_number,
                    'status' => $driver->status,
                    'roles' => $driver->roles->pluck('name')->values(),
                    'assigned_orders_count' => (int) ($driver->assigned_orders_count ?? 0),
                ];
            })->values(),
        ]);
    }

    public function assignDriver(Request $request, string $orderNumber): JsonResponse
    {
        $this->authorizeRoles($request, self::OPERATIONS_ROLES);

        $validated = $request->validate([
            'driver_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        if (in_array($order->status, ['delivered', 'cancelled'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => "Order #{$order->order_number} is already {$order->status} and cannot be assigned.",
            ], 422);
        }

        $driver = null;
        if (! empty($validated['driver_id'])) {
            $driver = $this->driversQuery()->whereKey((int) $validated['driver_id'])->first();
            if (! $driver) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The selected user is not an active delivery driver.',
                ], 422);
            }
        }

        $order->driver_id = $driver?->id;
        $order->driver_name = $driver?->name;
        $order->driver_phone = $driver?->phone_number;
        $order->save();

        return response()->json([
            'status' => 'ok',
            'message' => $driver
                ? "Order #{$order->order_number} assigned to {$driver->name}."
                : "Driver assignment removed from Order #{$order->order_number}.",
            'data' => $order->fresh()->load(['items', 'driver:id,name,email,phone_number']),
        ]);
    }

    public function sellerDashboard(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);
        if (! $user || ! $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'SELLER', 'SELLER_STAFF'])) {
            abort($user ? 403 : 401, 'Seller access is required.');
        }

        $sellerId = $user->hasRole(['SUPER_ADMIN', 'ADMIN']) && $request->filled('seller_id')
            ? (int) $request->input('seller_id')
            : $user->id;

        $application = SellerApplication::where('user_id', $sellerId)->first();
        $products = Product::where('seller_id', $sellerId);
        $orderItems = OrderItem::whereHas('product', fn ($q) => $q->where('seller_id', $sellerId))
            ->whereHas('order', fn ($q) => $q->where('status', '!=', 'cancelled'));
        $orderIds = (clone $orderItems)->select('order_id')->distinct()->pluck('order_id');

        $orders = Order::whereIn('id', $orderIds)
            ->with(['customer:id,name,email', 'items' => function ($query) use ($sellerId) {
                $query->whereHas('product', fn ($productQuery) => $productQuery->where('seller_id', $sellerId))
                    ->with('product:id,name,slug,image_url');
            }])
            ->latest('created_at')
            ->limit(12)
            ->get();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'application' => $application,
                'store' => [
                    'name' => $application?->store_name,
                    'slug' => $application?->slug,
                    'status' => $application?->status ?? ($user->hasRole(['SELLER', 'SELLER_STAFF']) ? 'approved' : 'pending'),
                ],
                'stats' => [
                    'gross_revenue' => (float) (clone $orderItems)->sum('total_price'),
                    'pending_orders' => (clone $orderItems)->whereHas('order', fn ($q) => $q->whereIn('status', ['pending', 'confirmed', 'processing']))->distinct('order_id')->count('order_id'),
                    'active_listings' => (clone $products)->where('is_active', true)->count(),
                    'total_listings' => (clone $products)->count(),
                    'payout_balance' => 0,
                ],
                'orders' => $orders,
            ],
        ]);
    }

    protected function currentUser(Request $request): ?User
    {
        return $request->user('sanctum') ?? $request->user();
    }

    protected function authorizeRoles(Request $request, array $roles): User
    {
        $user = $this->currentUser($request);
        if (! $user) {
            abort(401, 'Authentication is required for this operation.');
        }
        if (! $user->hasRole($roles)) {
            abort(403, 'You do not have permission to access this operation.');
        }

        return $user;
    }

    protected function driversQuery()
    {
        return User::query()
            ->select(['users.id', 'users.name', 'users.email', 'users.phone_number', 'users.status'])
            ->where('status', 'active')
            ->whereHas('roles', fn ($query) => $query->whereIn('slug', ['delivery_driver', 'courier']))
            ->with('roles')
            ->withCount(['assignedOrders as assigned_orders_count' => function ($query) {
                $query->whereIn('status', ['shipped', 'out_for_delivery']);
            }])
            ->orderBy('name');
    }
}
