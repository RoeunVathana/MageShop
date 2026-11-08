<?php

namespace App\Services\Category;

use App\Models\Category;
use App\Models\CategoryAttribute;
use App\Models\CategoryAttributeOption;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CategoryService
{
    /**
     * List categories with optional hierarchy nesting and search filtering.
     *
     * @return Collection|LengthAwarePaginator
     */
    public function listCategories(array $filters = [], bool $tree = false)
    {
        $query = Category::query();

        // Search by name or description
        if (! empty($filters['search'])) {
            $search = '%'.strtolower(trim($filters['search'])).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$search]);
            });
        }

        // Active filter
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // Parent filter
        if (isset($filters['parent_id'])) {
            if ($filters['parent_id'] === 'null' || $filters['parent_id'] === 'root' || $filters['parent_id'] === '') {
                $query->whereNull('parent_id');
            } elseif (is_numeric($filters['parent_id'])) {
                $query->where('parent_id', (int) $filters['parent_id']);
            }
        }

        if ($tree) {
            // Eager load tree starting from root categories
            return $query->whereNull('parent_id')
                ->with(['children.children', 'attributes.options'])
                ->withCount('products')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
        }

        // Flat listing with parent relationship and product counts
        $query->with(['parent', 'attributes.options'])->withCount('products');
        $query->orderBy('sort_order')->orderBy('name');

        if (! empty($filters['per_page'])) {
            $perPage = min((int) $filters['per_page'], 100);

            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Retrieve category by ID or unique slug.
     *
     * @param  int|string  $idOrSlug
     */
    public function getCategory($idOrSlug, bool $withAttributes = true): Category
    {
        $query = Category::query();

        if (is_numeric($idOrSlug)) {
            $query->where('id', (int) $idOrSlug);
        } else {
            $query->where('slug', $idOrSlug);
        }

        $relations = ['parent', 'children'];
        if ($withAttributes) {
            $relations[] = 'attributes.options';
        }

        return $query->with($relations)->withCount('products')->firstOrFail();
    }

    /**
     * Create a new category with cycle-safe parent assignment.
     */
    public function createCategory(array $data): Category
    {
        return DB::transaction(function () use ($data) {
            $slug = ! empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
            if (Category::where('slug', $slug)->exists()) {
                $slug .= '-'.Str::lower(Str::random(4));
            }

            $parentId = ! empty($data['parent_id']) ? (int) $data['parent_id'] : null;

            if ($parentId !== null && ! Category::where('id', $parentId)->exists()) {
                throw new InvalidArgumentException("Proposed parent category #{$parentId} does not exist.");
            }

            $category = Category::create([
                'parent_id' => $parentId,
                'name' => trim($data['name']),
                'slug' => $slug,
                'icon' => $data['icon'] ?? 'Package',
                'image_url' => $data['image_url'] ?? null,
                'description' => $data['description'] ?? null,
                'sort_order' => (int) ($data['sort_order'] ?? 0),
                'is_active' => $data['is_active'] ?? true,
                'seo_title' => $data['seo_title'] ?? null,
                'seo_description' => $data['seo_description'] ?? null,
                'seo_keywords' => $data['seo_keywords'] ?? null,
            ]);

            return $category->load(['parent', 'children', 'attributes.options']);
        });
    }

    /**
     * Update an existing category with strict cycle prevention.
     */
    public function updateCategory(Category $category, array $data): Category
    {
        return DB::transaction(function () use ($category, $data) {
            // Verify parent cycle prevention
            if (array_key_exists('parent_id', $data)) {
                $proposedParentId = ! empty($data['parent_id']) ? (int) $data['parent_id'] : null;
                $category->setParentCategory($proposedParentId);
            }

            if (! empty($data['name'])) {
                $category->name = trim($data['name']);
            }
            if (! empty($data['slug']) && $data['slug'] !== $category->slug) {
                $category->slug = Str::slug($data['slug']);
            }
            if (array_key_exists('icon', $data)) {
                $category->icon = $data['icon'];
            }
            if (array_key_exists('image_url', $data)) {
                $category->image_url = $data['image_url'];
            }
            if (array_key_exists('description', $data)) {
                $category->description = $data['description'];
            }
            if (array_key_exists('sort_order', $data)) {
                $category->sort_order = (int) $data['sort_order'];
            }
            if (array_key_exists('is_active', $data)) {
                $category->is_active = (bool) $data['is_active'];
            }
            if (array_key_exists('seo_title', $data)) {
                $category->seo_title = $data['seo_title'];
            }
            if (array_key_exists('seo_description', $data)) {
                $category->seo_description = $data['seo_description'];
            }
            if (array_key_exists('seo_keywords', $data)) {
                $category->seo_keywords = $data['seo_keywords'];
            }

            $category->save();

            return $category->load(['parent', 'children', 'attributes.options']);
        });
    }

    /**
     * Safely delete a category.
     */
    public function deleteCategory(Category $category): void
    {
        DB::transaction(function () use ($category) {
            // Move child categories to category's parent
            $category->children()->update(['parent_id' => $category->parent_id]);

            // Reassign direct products to parent category if exists, or null
            $category->products()->update(['category_id' => $category->parent_id]);

            $category->delete();
        });
    }

    /**
     * Add configurable attribute definition to a category.
     */
    public function addAttribute(Category $category, array $data): CategoryAttribute
    {
        return DB::transaction(function () use ($category, $data) {
            $code = ! empty($data['code']) ? Str::slug($data['code'], '_') : Str::slug($data['name'], '_');

            $attribute = CategoryAttribute::create([
                'category_id' => $category->id,
                'name' => trim($data['name']),
                'code' => $code,
                'type' => $data['type'] ?? 'text',
                'is_required' => (bool) ($data['is_required'] ?? false),
                'is_filterable' => (bool) ($data['is_filterable'] ?? true),
                'is_variant_option' => (bool) ($data['is_variant_option'] ?? false),
                'sort_order' => (int) ($data['sort_order'] ?? 0),
                'validation_rules' => $data['validation_rules'] ?? null,
            ]);

            // Add predefined options if provided
            if (! empty($data['options']) && is_array($data['options'])) {
                foreach ($data['options'] as $idx => $opt) {
                    $val = is_array($opt) ? ($opt['value'] ?? $opt['label']) : $opt;
                    $label = is_array($opt) ? ($opt['label'] ?? $val) : $val;

                    CategoryAttributeOption::create([
                        'category_attribute_id' => $attribute->id,
                        'value' => (string) $val,
                        'label' => (string) $label,
                        'sort_order' => is_array($opt) ? (int) ($opt['sort_order'] ?? $idx) : $idx,
                    ]);
                }
            }

            return $attribute->load('options');
        });
    }

    /**
     * Update an attribute definition and its option choices.
     */
    public function updateAttribute(CategoryAttribute $attribute, array $data): CategoryAttribute
    {
        return DB::transaction(function () use ($attribute, $data) {
            if (! empty($data['name'])) {
                $attribute->name = trim($data['name']);
            }
            if (! empty($data['code'])) {
                $attribute->code = Str::slug($data['code'], '_');
            }
            if (! empty($data['type'])) {
                $attribute->type = $data['type'];
            }
            if (array_key_exists('is_required', $data)) {
                $attribute->is_required = (bool) $data['is_required'];
            }
            if (array_key_exists('is_filterable', $data)) {
                $attribute->is_filterable = (bool) $data['is_filterable'];
            }
            if (array_key_exists('is_variant_option', $data)) {
                $attribute->is_variant_option = (bool) $data['is_variant_option'];
            }
            if (array_key_exists('sort_order', $data)) {
                $attribute->sort_order = (int) $data['sort_order'];
            }
            if (array_key_exists('validation_rules', $data)) {
                $attribute->validation_rules = $data['validation_rules'];
            }

            $attribute->save();

            // Sync options if passed
            if (isset($data['options']) && is_array($data['options'])) {
                $existingOptionIds = [];
                foreach ($data['options'] as $idx => $opt) {
                    $optId = is_array($opt) ? ($opt['id'] ?? null) : null;
                    $val = is_array($opt) ? ($opt['value'] ?? $opt['label']) : $opt;
                    $label = is_array($opt) ? ($opt['label'] ?? $val) : $val;
                    $order = is_array($opt) ? (int) ($opt['sort_order'] ?? $idx) : $idx;

                    if ($optId && $existing = CategoryAttributeOption::find($optId)) {
                        $existing->update([
                            'value' => (string) $val,
                            'label' => (string) $label,
                            'sort_order' => $order,
                        ]);
                        $existingOptionIds[] = $existing->id;
                    } else {
                        $newOpt = CategoryAttributeOption::create([
                            'category_attribute_id' => $attribute->id,
                            'value' => (string) $val,
                            'label' => (string) $label,
                            'sort_order' => $order,
                        ]);
                        $existingOptionIds[] = $newOpt->id;
                    }
                }

                // Delete options that were removed
                $attribute->options()->whereNotIn('id', $existingOptionIds)->delete();
            }

            return $attribute->load('options');
        });
    }
}
