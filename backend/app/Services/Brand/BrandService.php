<?php

namespace App\Services\Brand;

use App\Models\Brand;
use App\Models\BrandTranslation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BrandService
{
    /**
     * List brands with optional search, status filtering, and sorting.
     */
    public function listBrands(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Brand::query()->withCount('products');

        if (!empty($filters['search'])) {
            $search = '%' . strtolower($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(slug) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(country) LIKE ?', [$search]);
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $sort = $filters['sort_by'] ?? 'sort_order';
        $direction = strtolower($filters['sort_dir'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        if (in_array($sort, ['name', 'sort_order', 'created_at', 'products_count'])) {
            $query->orderBy($sort, $direction);
        } else {
            $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc');
        }

        return $query->paginate($perPage);
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

            if (!empty($translations)) {
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
