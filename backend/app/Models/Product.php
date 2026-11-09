<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'brand_id',
        'name',
        'brand',
        'slug',
        'sku',
        'product_type',
        'description',
        'selling_price',
        'cost_price',
        'currency',
        'price',
        'discount_price',
        'status',
        'stock_quantity',
        'low_stock_threshold',
        'weight',
        'dimensions',
        'rating',
        'reviews_count',
        'image_url',
        'gallery_urls',
        'is_active',
        'is_featured',
        'is_new_arrival',
        'is_best_seller',
        'is_flash_sale',
        'specifications',
    ];

    protected $casts = [
        'selling_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'weight' => 'decimal:3',
        'dimensions' => 'array',
        'rating' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'reviews_count' => 'integer',
        'gallery_urls' => 'array',
        'specifications' => 'array',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'is_new_arrival' => 'boolean',
        'is_best_seller' => 'boolean',
        'is_flash_sale' => 'boolean',
    ];

    protected $appends = [
        'available_stock',
    ];

    /**
     * Relationship to Category.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Associated Brand entity.
     */
    public function brandRecord(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    /**
     * Secondary / Multi-category associations.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'product_categories')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * Product variants (Size, Color, Capacity options).
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('id');
    }

    /**
     * Category dynamic attribute values.
     */
    public function attributeValues(): HasMany
    {
        return $this->hasMany(ProductAttributeValue::class);
    }

    /**
     * Check if product is variable.
     */
    public function isVariable(): bool
    {
        return $this->product_type === 'variable';
    }

    /**
     * Check if product is digital.
     */
    public function isDigital(): bool
    {
        return $this->product_type === 'digital';
    }

    /**
     * Relationship to single Inventory record.
     */
    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class);
    }

    /**
     * Relationship to historical inventory movements.
     */
    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    /**
     * Available Stock = Quantity On Hand - Quantity Reserved
     */
    public function getAvailableStockAttribute(): int
    {
        if ($this->relationLoaded('inventory') && $this->inventory) {
            return $this->inventory->available_stock;
        }

        // Fallback to stock_quantity if inventory relationship not loaded
        return max(0, (int) ($this->stock_quantity ?? 0));
    }

    /**
     * Get selling price, falling back to price.
     */
    public function getSellingPriceAttribute($value): float
    {
        return (float) ($value ?? $this->attributes['price'] ?? 0);
    }

    /**
     * Ensure selling price and price stay synchronized and non-negative.
     */
    public function setSellingPriceAttribute($value): void
    {
        $val = (float) $value;
        if ($val < 0) {
            throw new InvalidArgumentException('Selling price cannot be negative.');
        }

        $this->attributes['selling_price'] = $val;
        $this->attributes['price'] = $val;
    }

    /**
     * Ensure cost price is non-negative.
     */
    public function setCostPriceAttribute($value): void
    {
        $val = (float) $value;
        if ($val < 0) {
            throw new InvalidArgumentException('Cost price cannot be negative.');
        }

        $this->attributes['cost_price'] = $val;
    }

    /**
     * Safe archive instead of destructive delete.
     */
    public function archive(): void
    {
        $this->update([
            'status' => 'archived',
            'is_active' => false,
        ]);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', '!=', 'archived')->where('is_active', true);
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    public function scopeFlashSale(Builder $query): Builder
    {
        return $query->where('is_flash_sale', true);
    }

    public function scopeNewArrivals(Builder $query): Builder
    {
        return $query->where('is_new_arrival', true);
    }

    public function scopeBestSellers(Builder $query): Builder
    {
        return $query->where('is_best_seller', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
    }

    /**
     * Atomically adjust inventory quantity with movement tracking.
     */
    public function adjustStock(int $quantityChange, string $type, ?int $userId = null, ?string $reason = null, ?string $referenceId = null, ?string $idempotencyKey = null): self
    {
        return DB::transaction(function () use ($quantityChange, $type, $userId, $reason, $referenceId, $idempotencyKey) {
            // Lock product record for update to prevent race conditions
            $locked = self::where('id', $this->id)->lockForUpdate()->firstOrFail();

            // Lock inventory record
            $inv = Inventory::where('product_id', $locked->id)->lockForUpdate()->first();
            if (! $inv) {
                $inv = Inventory::create([
                    'product_id' => $locked->id,
                    'quantity_on_hand' => $locked->stock_quantity,
                    'quantity_reserved' => 0,
                ]);
            }

            $before = $inv->quantity_on_hand;
            $after = $before + $quantityChange;

            if ($after < 0) {
                throw new InvalidArgumentException("Insufficient stock. Current on-hand is {$before}, requested adjustment is {$quantityChange}.");
            }

            $inv->update(['quantity_on_hand' => $after]);
            $locked->update(['stock_quantity' => $after]);

            InventoryMovement::create([
                'product_id' => $locked->id,
                'user_id' => $userId,
                'created_by' => $userId,
                'quantity_change' => $quantityChange,
                'type' => $type,
                'movement_type' => $type,
                'before_quantity' => $before,
                'after_quantity' => $after,
                'reason' => $reason,
                'reference_id' => $referenceId,
                'reference' => $referenceId,
                'idempotency_key' => $idempotencyKey,
            ]);

            return $locked;
        });
    }

    /**
     * Resolve the model for route binding (supports both numeric ID and slug).
     * Prevents PostgreSQL 22P02 invalid input syntax error.
     */
    public function resolveRouteBinding($value, $field = null)
    {
        if ($field) {
            if ($field === 'id' && ! is_numeric($value)) {
                return null;
            }

            return $this->where($field, $value)->first();
        }

        if (is_numeric($value)) {
            return $this->where('id', (int) $value)->first();
        }

        return $this->where('slug', (string) $value)->first();
    }
}
