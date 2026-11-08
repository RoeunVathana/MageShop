<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku',
        'name',
        'selling_price',
        'cost_price',
        'stock_quantity',
        'low_stock_threshold',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'selling_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'available_stock',
    ];

    /**
     * Parent product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Variant specific attribute values (e.g. Size=XL, Color=Red).
     */
    public function attributeValues(): HasMany
    {
        return $this->hasMany(VariantAttributeValue::class);
    }

    /**
     * Dedicated 1:1 inventory record for this variant SKU.
     */
    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class, 'variant_id');
    }

    /**
     * Historical movement logs for this variant.
     */
    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class, 'variant_id');
    }

    /**
     * Compute available stock for this variant.
     */
    public function getAvailableStockAttribute(): int
    {
        if ($this->relationLoaded('inventory') && $this->inventory) {
            return $this->inventory->available_stock;
        }

        return max(0, (int) ($this->stock_quantity ?? 0));
    }
}
