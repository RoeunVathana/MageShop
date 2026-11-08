<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'name',
        'slug',
        'icon',
        'image_url',
        'description',
        'sort_order',
        'is_active',
        'seo_title',
        'seo_description',
        'seo_keywords',
    ];

    protected $casts = [
        'parent_id' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Resolve route model binding by ID or slug.
     * Prevents PostgreSQL 22P02 invalid input syntax error.
     */
    public function resolveRouteBinding($value, $field = null)
    {
        if ($field) {
            if ($field === 'id' && !is_numeric($value)) {
                return null;
            }
            return $this->where($field, $value)->first();
        }

        if (is_numeric($value)) {
            return $this->where('id', (int) $value)->first();
        }

        return $this->where('slug', (string) $value)->first();
    }

    /**
     * Parent category relationship.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Immediate children categories.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Configured dynamic attributes for products in this category.
     */
    public function attributes(): HasMany
    {
        return $this->hasMany(CategoryAttribute::class)->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Direct products where this is the primary category.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * All products associated through product_categories pivot.
     */
    public function allProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_categories')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * Recursively retrieve all descendant category IDs to prevent hierarchy cycles.
     */
    public function getAllDescendantIds(): array
    {
        $descendants = [];
        $children = $this->children()->get(['id']);

        foreach ($children as $child) {
            $descendants[] = $child->id;
            $descendants = array_merge($descendants, $child->getAllDescendantIds());
        }

        return $descendants;
    }

    /**
     * Verify whether a designated parentId would introduce an illegal hierarchy cycle.
     */
    public function canSetParent(?int $proposedParentId): bool
    {
        if ($proposedParentId === null) {
            return true;
        }

        if ($this->exists && $this->id === $proposedParentId) {
            return false;
        }

        if ($this->exists && in_array($proposedParentId, $this->getAllDescendantIds(), true)) {
            return false;
        }

        return true;
    }

    /**
     * Safe parent setter with cycle prevention enforcement.
     */
    public function setParentCategory(?int $parentId): self
    {
        if (!$this->canSetParent($parentId)) {
            throw new InvalidArgumentException("Cannot assign parent category #{$parentId} as it would create a circular hierarchy loop.");
        }

        $this->parent_id = $parentId;
        return $this;
    }
}
