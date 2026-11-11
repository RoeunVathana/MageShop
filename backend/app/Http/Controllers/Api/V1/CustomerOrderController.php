<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerOrderController extends Controller
{
    /**
     * Return only the authenticated customer's own orders.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);

        $orders = Order::query()
            ->with(['items', 'payments'])
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function cancel(Request $request, string $orderNumber): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        $order = Order::where('order_number', $orderNumber)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if (! in_array($order->status, ['pending', 'confirmed'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'This order has already entered fulfillment and can no longer be cancelled here.',
            ], 422);
        }

        $order->update(['status' => 'cancelled']);

        return response()->json([
            'status' => 'success',
            'message' => "Order #{$order->order_number} was cancelled.",
            'data' => $order->fresh()->load('items'),
        ]);
    }
}
