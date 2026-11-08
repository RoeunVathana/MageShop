<?php

namespace App\Services\Inventory;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryService
{
    /**
     * List all inventory records with product details and calculated available stock.
     */
    public function listInventory(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Product::with(['inventory', 'category', 'brandRecord']);

        // Search by product name or SKU
        if (! empty($filters['search'])) {
            $search = '%'.strtolower(trim($filters['search'])).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(sku) LIKE ?', [$search]);
            });
        }

        // Low stock filter
        if (! empty($filters['low_stock'])) {
            $query->whereHas('inventory', function ($q) {
                $q->whereRaw('quantity_on_hand <= (SELECT low_stock_threshold FROM products WHERE products.id = inventories.product_id)');
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Get inventory details for a single product.
     */
    public function getInventory(Product $product): Inventory
    {
        $inventory = Inventory::firstOrCreate(
            ['product_id' => $product->id],
            [
                'quantity_on_hand' => (int) ($product->stock_quantity ?? 0),
                'quantity_reserved' => 0,
            ]
        );

        return $inventory->load('product');
    }

    /**
     * Atomically adjust inventory according to the 15-step enterprise process.
     */
    public function adjustStock(
        Product $product,
        int $quantityChange,
        string $movementType,
        string $reason,
        ?string $reference = null,
        ?int $userId = null,
        ?string $idempotencyKey = null
    ): array {
        $allowedTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGE', 'RETURN'];
        $normalizedType = strtoupper(trim($movementType));

        if (! in_array($normalizedType, $allowedTypes)) {
            throw new InvalidArgumentException("Invalid movement type: '{$movementType}'. Allowed: ".implode(', ', $allowedTypes));
        }

        if ($quantityChange === 0) {
            throw new InvalidArgumentException('Adjustment quantity cannot be zero.');
        }

        // Step 6: Begin Database Transaction
        return DB::transaction(function () use (
            $product,
            $quantityChange,
            $normalizedType,
            $reason,
            $reference,
            $userId,
            $idempotencyKey
        ) {
            // Step 8: Idempotency check to prevent duplicate adjustments
            if (! empty($idempotencyKey)) {
                $existingMovement = InventoryMovement::where('idempotency_key', $idempotencyKey)->first();
                if ($existingMovement) {
                    $inv = Inventory::where('product_id', $product->id)->first();

                    return [
                        'status' => 'idempotent_replay',
                        'inventory' => $inv,
                        'movement' => $existingMovement,
                    ];
                }
            }

            // Step 7: Lock Inventory record for update
            $inventory = Inventory::where('product_id', $product->id)->lockForUpdate()->first();

            if (! $inventory) {
                $inventory = Inventory::create([
                    'product_id' => $product->id,
                    'quantity_on_hand' => (int) ($product->stock_quantity ?? 0),
                    'quantity_reserved' => 0,
                ]);
                $inventory = Inventory::where('product_id', $product->id)->lockForUpdate()->first();
            }

            // Step 9: Read current stock
            $currentOnHand = $inventory->quantity_on_hand;

            // Step 10: Calculate proposed stock
            $proposedOnHand = $currentOnHand + $quantityChange;

            // Step 11: Reject invalid negative stock
            if ($proposedOnHand < 0) {
                throw new InvalidArgumentException(
                    "Insufficient inventory. Current on-hand quantity is {$currentOnHand}, requested adjustment is {$quantityChange}."
                );
            }

            // Ensure available stock also doesn't go below 0 (on-hand cannot drop below reserved)
            if ($proposedOnHand < $inventory->quantity_reserved) {
                throw new InvalidArgumentException(
                    "Cannot reduce on-hand stock below currently reserved stock ({$inventory->quantity_reserved} units reserved)."
                );
            }

            // Step 12: Update inventory quantity
            $inventory->update(['quantity_on_hand' => $proposedOnHand]);

            // Sync with Product stock_quantity
            Product::where('id', $product->id)->update(['stock_quantity' => $proposedOnHand]);

            // Step 13: Create immutable inventory movement record
            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'movement_type' => $normalizedType,
                'type' => strtolower($normalizedType),
                'quantity_change' => $quantityChange,
                'before_quantity' => $currentOnHand,
                'after_quantity' => $proposedOnHand,
                'reason' => $reason,
                'reference' => $reference,
                'reference_id' => $reference,
                'created_by' => $userId,
                'user_id' => $userId,
                'idempotency_key' => $idempotencyKey,
            ]);

            // Step 14 & 15: Commit transaction and return updated response
            return [
                'status' => 'success',
                'inventory' => $inventory->fresh(['product']),
                'movement' => $movement,
            ];
        });
    }

    /**
     * Retrieve paginated inventory movements for a product.
     */
    public function getMovements(Product $product, int $perPage = 20): LengthAwarePaginator
    {
        return InventoryMovement::with('creator')
            ->where('product_id', $product->id)
            ->orderByDesc('id')
            ->paginate($perPage);
    }
}
