<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAttributeValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'category_attribute_id',
        'selected_option_id',
        'value',
    ];

    /**
     * Parent product relationship.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Attribute definition relationship.
     */
    public function attribute(): BelongsTo
    {
        return $this->belongsTo(CategoryAttribute::class, 'category_attribute_id');
    }

    /**
     * Selected predefined option (if select / multi-select).
     */
    public function selectedOption(): BelongsTo
    {
        return $this->belongsTo(CategoryAttributeOption::class, 'selected_option_id');
    }

    /**
     * Computed display value.
     */
    public function getDisplayValueAttribute(): string
    {
        if ($this->relationLoaded('selectedOption') && $this->selectedOption) {
            return $this->selectedOption->label;
        }

        return (string) ($this->value ?? '');
    }
}
