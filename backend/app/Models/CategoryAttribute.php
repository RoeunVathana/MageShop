<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategoryAttribute extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'code',
        'type',
        'is_required',
        'is_filterable',
        'is_variant_option',
        'sort_order',
        'validation_rules',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_filterable' => 'boolean',
        'is_variant_option' => 'boolean',
        'sort_order' => 'integer',
        'validation_rules' => 'array',
    ];

    /**
     * Parent category relationship.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Predefined options for select or multi-select inputs.
     */
    public function options(): HasMany
    {
        return $this->hasMany(CategoryAttributeOption::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Product values assigned to this attribute.
     */
    public function values(): HasMany
    {
        return $this->hasMany(ProductAttributeValue::class);
    }
}

