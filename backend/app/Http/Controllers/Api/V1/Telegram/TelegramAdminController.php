<?php

namespace App\Http\Controllers\Api\V1\Telegram;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\TelegramAdminAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class TelegramAdminController extends Controller
{
    /**
     * Check authorization for Telegram staff operations.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        $isStaff = $user && (
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('STAFF') ||
            $user->telegramAccount?->is_bot_admin
        );

        if (!$isStaff) {
            abort(403, 'Unauthorized. Staff privileges required.');
        }
    }

    /**
     * Get stock inventory summary or low stock alerts.
     */
    public function stock(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $sku = $request->query('sku');
        $lowStockOnly = $request->boolean('low_stock', false);

        $query = Product::with('category');

        if (!empty($sku)) {
            $query->where('sku', strtoupper($sku));
        }

        if ($lowStockOnly) {
            $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
        }

        $products = $query->orderBy('stock_quantity', 'asc')->paginate(25);

        return response()->json([
            'status' => 'success',
            'data' => $products->items(),
            'meta' => [
                'total' => $products->total(),
                'low_stock_count' => Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')->count(),
            ],
        ]);
    }

    /**
     * Adjust product stock atomically with full audit trail.
     */
    public function adjustStock(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'delta' => 'required|integer|not_in:0',
            'reason' => 'nullable|string|max:255',
            'type' => 'nullable|string|in:adjustment,restock,damage,correction',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $delta = (int) $validated['delta'];
        $type = $validated['type'] ?? 'adjustment';
        $reason = $validated['reason'] ?? 'Manual stock adjustment via Admin panel';
        $userId = Auth::id();

        try {
            $product->adjustStock(
                quantityChange: $delta,
                type: $type,
                userId: $userId,
                reason: $reason
            );

            TelegramAdminAction::create([
                'staff_id' => $userId,
                'action' => 'stock_adjust',
                'target_type' => 'Product',
                'target_id' => (string) $product->id,
                'payload' => [
                    'sku' => $product->sku,
                    'delta' => $delta,
                    'new_stock' => $product->stock_quantity,
                    'reason' => $reason,
                ],
                'confirmation_status' => 'confirmed',
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Stock adjusted by {$delta}. New stock: {$product->stock_quantity}",
                'data' => [
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'new_stock' => $product->stock_quantity,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get administrative sales and operations summary.
     */
    public function salesSummary(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        $salesToday = Order::whereDate('created_at', $today)->where('payment_status', 'paid')->sum('total_amount');
        $ordersToday = Order::whereDate('created_at', $today)->count();

        $salesWeek = Order::where('created_at', '>=', $startOfWeek)->where('payment_status', 'paid')->sum('total_amount');
        $ordersWeek = Order::where('created_at', '>=', $startOfWeek)->count();

        $salesMonth = Order::where('created_at', '>=', $startOfMonth)->where('payment_status', 'paid')->sum('total_amount');
        $ordersMonth = Order::where('created_at', '>=', $startOfMonth)->count();

        $pendingCount = Order::where('status', 'pending')->count();
        $lowStockCount = Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')->count();
        $totalProducts = Product::count();
        $totalStockUnits = Product::sum('stock_quantity');

        return response()->json([
            'status' => 'success',
            'data' => [
                'today' => [
                    'sales' => (float) $salesToday,
                    'orders' => $ordersToday,
                ],
                'this_week' => [
                    'sales' => (float) $salesWeek,
                    'orders' => $ordersWeek,
                ],
                'this_month' => [
                    'sales' => (float) $salesMonth,
                    'orders' => $ordersMonth,
                ],
                'operations' => [
                    'pending_orders' => $pendingCount,
                    'low_stock_items' => $lowStockCount,
                    'catalog_products' => $totalProducts,
                    'warehouse_units' => (int) $totalStockUnits,
                ],
            ],
        ]);
    }
}

