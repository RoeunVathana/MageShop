<?php

namespace App\Services\Brand;

use App\Models\Brand;
use App\Models\BrandTranslation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BrandService
{
    /**
     * List brands with optional search, status filtering, and sorting.
     */
    public function listBrands(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $cacheFilters = $filters;
        ksort($cacheFilters);
        $cacheKey = 'catalog:brands:'.sha1((string) json_encode([
            'filters' => $cacheFilters,
            'per_page' => $perPage,
        ]));

        // Keep the public filter list small. Translations and product details
        // belong to the brand detail/admin screens, not every filter request.
        $query = Brand::query()
            ->select([
                'id',
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
                'created_at',
                'updated_at',
            ])
            ->withCount('products');

        if (! empty($filters['search'])) {
            $search = '%'.strtolower($filters['search']).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(country) LIKE ?', [$search]);
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $sort = $filters['sort_by'] ?? 'created_at';
        $direction = strtolower($filters['sort_dir'] ?? $filters['sort_direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        if (in_array($sort, ['name', 'sort_order', 'created_at', 'id', 'products_count'])) {
            $query->orderBy($sort, $direction);
        } else {
            $query->orderBy('id', 'desc');
        }

        return $this->rememberRedis($cacheKey, 60, fn () => $query->paginate($perPage));
    }

    protected function rememberRedis(string $key, int $seconds, callable $callback): mixed
    {
        try {
            return Cache::store('redis')->remember($key, now()->addSeconds($seconds), $callback);
        } catch (\Throwable) {
            return $callback();
        }
    }

    /**
     * Create brand with optional translations.
     */
    public function createBrand(array $data): Brand
    {
        return DB::transaction(function () use ($data) {
            if (empty($data['slug'])) {
                $data['slug'] = Brand::generateUniqueSlug($data['name']);
            }

            $translations = $data['translations'] ?? [];
            unset($data['translations']);

            $brand = Brand::create($data);

            if (! empty($translations)) {
                $this->syncTranslations($brand, $translations);
            }

            return $brand->fresh(['translations', 'products']);
        });
    }

    /**
     * Update brand details and translations.
     */
    public function updateBrand(Brand $brand, array $data): Brand
    {
        return DB::transaction(function () use ($brand, $data) {
            $translations = $data['translations'] ?? null;
            unset($data['translations']);

            $brand->update($data);

            if ($translations !== null) {
                $this->syncTranslations($brand, $translations);
            }

            return $brand->fresh(['translations', 'products']);
        });
    }

    /**
     * Safely archive brand instead of deleting products.
     */
    public function archiveBrand(Brand $brand): Brand
    {
        $brand->update([
            'is_active' => false,
            'status' => 'archived',
        ]);

        return $brand;
    }

    /**
     * Synchronize brand translations.
     */
    public function syncTranslations(Brand $brand, array $translations): void
    {
        foreach ($translations as $item) {
            if (empty($item['locale']) || empty($item['name'])) {
                continue;
            }

            BrandTranslation::updateOrCreate(
                [
                    'brand_id' => $brand->id,
                    'locale' => $item['locale'],
                ],
                [
                    'name' => $item['name'],
                    'description' => $item['description'] ?? null,
                ]
            );
        }
    }
}
