<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'movement_type' => $this->movement_type ?? strtoupper($this->type ?? 'ADJUSTMENT'),
            'quantity_change' => (int) $this->quantity_change,
            'before_quantity' => (int) $this->before_quantity,
            'after_quantity' => (int) $this->after_quantity,
            'reason' => $this->reason,
            'reference' => $this->reference ?? $this->reference_id,
            'created_by' => $this->created_by ?? $this->user_id,
            'creator_name' => $this->creator?->name ?? $this->user?->name ?? 'System',
            'idempotency_key' => $this->idempotency_key,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

