<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VariantAttributeValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_variant_id',
        'category_attribute_id',
        'attribute_option_id',
        'custom_value',
    ];

    /**
     * Parent product variant.
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Attribute definition.
     */
    public function attribute(): BelongsTo
    {
        return $this->belongsTo(CategoryAttribute::class, 'category_attribute_id');
    }

    /**
     * Selected predefined option.
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(CategoryAttributeOption::class, 'attribute_option_id');
    }

    /**
     * Computed display value.
     */
    public function getDisplayValueAttribute(): string
    {
        if ($this->relationLoaded('option') && $this->option) {
            return $this->option->label;
        }

        return (string) ($this->custom_value ?? '');
    }
}
