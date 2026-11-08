<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class Inventory extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'variant_id',
        'quantity_on_hand',
        'quantity_reserved',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'variant_id' => 'integer',
        'quantity_on_hand' => 'integer',
        'quantity_reserved' => 'integer',
    ];

    protected $appends = [
        'available_stock',
    ];

    /**
     * Relationship to Product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Relationship to ProductVariant (if variant SKU).
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /**
     * Available Stock = Quantity On Hand - Quantity Reserved
     */
    public function getAvailableStockAttribute(): int
    {
        return max(0, $this->quantity_on_hand - $this->quantity_reserved);
    }

    /**
     * Set quantity on hand with strict non-negative validation.
     */
    public function setQuantityOnHandAttribute(int $value): void
    {
        if ($value < 0) {
            throw new InvalidArgumentException('Quantity on hand cannot be negative.');
        }

        $this->attributes['quantity_on_hand'] = $value;
    }

    /**
     * Set quantity reserved with constraint validation.
     */
    public function setQuantityReservedAttribute(int $value): void
    {
        if ($value < 0) {
            throw new InvalidArgumentException('Quantity reserved cannot be negative.');
        }

        if (isset($this->attributes['quantity_on_hand']) && $value > $this->attributes['quantity_on_hand']) {
            throw new InvalidArgumentException('Reserved quantity cannot exceed quantity on hand.');
        }

        $this->attributes['quantity_reserved'] = $value;
    }
}

