<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'variant_id',
        'movement_type',
        'type',
        'quantity_change',
        'before_quantity',
        'after_quantity',
        'reason',
        'reference',
        'reference_id',
        'created_by',
        'user_id',
        'idempotency_key',
    ];

    protected $casts = [
        'quantity_change' => 'integer',
        'before_quantity' => 'integer',
        'after_quantity' => 'integer',
        'variant_id' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getMovementTypeAttribute(?string $value): string
    {
        return $value ?? $this->attributes['type'] ?? 'ADJUSTMENT';
    }

    public function getReferenceAttribute(?string $value): ?string
    {
        return $value ?? $this->attributes['reference_id'] ?? null;
    }
}
