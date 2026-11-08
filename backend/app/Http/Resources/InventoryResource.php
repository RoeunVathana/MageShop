<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $product = $this->product;
        $onHand = (int) $this->quantity_on_hand;
        $reserved = (int) $this->quantity_reserved;
        $available = max(0, $onHand - $reserved);
        $threshold = (int) ($product?->low_stock_threshold ?? 5);

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $product?->name,
            'sku' => $product?->sku,
            'status' => $product?->status ?? 'active',
            'quantity_on_hand' => $onHand,
            'quantity_reserved' => $reserved,
            'available_stock' => $available,
            'low_stock_threshold' => $threshold,
            'is_low_stock' => $onHand <= $threshold,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
