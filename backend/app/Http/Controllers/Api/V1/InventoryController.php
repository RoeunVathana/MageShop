<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\AdjustStockRequest;
use App\Http\Resources\InventoryMovementResource;
use App\Http\Resources\InventoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Inventory;
use App\Models\Product;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use InvalidArgumentException;

class InventoryController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    /**
     * View stock levels across all products.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Inventory::class);

        $perPage = min((int) $request->query('per_page', 15), 100);
        $products = $this->inventoryService->listInventory($request->query(), $perPage);

        return ProductResource::collection($products);
    }

    /**
     * View inventory for a specific product.
     */
    public function show(Request $request, Product $product): JsonResponse
    {
        $this->authorize('view', Inventory::class);

        $inventory = $this->inventoryService->getInventory($product);

        return response()->json([
            'status' => 'success',
            'data' => new InventoryResource($inventory),
        ]);
    }

    /**
     * Adjust stock with atomic locking, negative stock prevention, and movement logging.
     */
    public function adjust(AdjustStockRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $this->inventoryService->adjustStock(
                $product,
                (int) $validated['quantity_change'],
                $validated['movement_type'],
                $validated['reason'],
                $validated['reference'] ?? null,
                $request->user()?->id,
                $validated['idempotency_key'] ?? null
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Stock adjusted successfully.',
                'data' => [
                    'inventory' => new InventoryResource($result['inventory']),
                    'movement' => new InventoryMovementResource($result['movement']),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * View inventory movement history for a product.
     */
    public function movements(Request $request, Product $product): AnonymousResourceCollection
    {
        $this->authorize('viewHistory', Inventory::class);

        $perPage = min((int) $request->query('per_page', 20), 100);
        $movements = $this->inventoryService->getMovements($product, $perPage);

        return InventoryMovementResource::collection($movements);
    }
}
