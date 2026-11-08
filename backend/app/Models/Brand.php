<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Brand extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'description',
        'country',
        'website',
        'status',
        'is_active',
        'sort_order',
        'seo_title',
        'seo_description',
        'seo_keywords',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Scope query to only active brands.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->where('status', 'active');
    }

    /**
     * Products associated with this brand.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'brand_id');
    }

    /**
     * Brand translations (Khmer / English).
     */
    public function translations(): HasMany
    {
        return $this->hasMany(BrandTranslation::class, 'brand_id');
    }

    /**
     * Get translated name or fallback to default name.
     */
    public function getLocalizedName(string $locale = 'en'): string
    {
        if ($locale === 'en') {
            return $this->name;
        }

        $translation = $this->translations->firstWhere('locale', $locale);
        return $translation ? $translation->name : $this->name;
    }

    /**
     * Resolve route binding supporting both numeric ID and text slug.
     * Prevents PostgreSQL 22P02 invalid input syntax error.
     */
    public function resolveRouteBinding($value, $field = null): ?self
    {
        if ($field) {
            return $this->where($field, $value)->first();
        }

        if (is_numeric($value)) {
            return $this->where('id', (int) $value)->first();
        }

        return $this->where('slug', (string) $value)->first();
    }

    /**
     * Generate unique slug on creation if not provided.
     */
    public static function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $counter = 1;

        while (static::where('slug', $slug)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
