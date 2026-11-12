<?php

namespace App\Services\Product;

use App\Models\Brand;
use App\Models\Category;
use App\Models\CategoryAttribute;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\VariantAttributeValue;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ProductService
{
    /**
     * List products with multi-category hierarchy filtering, search, status, and pagination.
     */
    public function listProducts(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $cacheFilters = $filters;
        ksort($cacheFilters);
        $cacheKey = 'catalog:products:'.sha1((string) json_encode([
            'filters' => $cacheFilters,
            'per_page' => $perPage,
        ]));

        // List pages only need catalog card/table fields. Loading variants,
        // attributes, and every secondary category here made one request fan
        // out into a large number of queries and a very large JSON response.
        // Product details are loaded by show() when a user opens one product.
        $isCardView = ($filters['view'] ?? null) === 'card';
        $columns = [
            'id',
            'category_id',
            'brand_id',
            'seller_id',
            'name',
            'brand',
            'slug',
            'sku',
            'product_type',
            'selling_price',
            'currency',
            'price',
            'discount_price',
            'status',
            'is_active',
            'is_featured',
            'is_new_arrival',
            'is_best_seller',
            'is_flash_sale',
            'rating',
            'reviews_count',
            'stock_quantity',
            'low_stock_threshold',
            'image_url',
            'created_at',
            'updated_at',
        ];

        if (! $isCardView) {
            $columns = array_merge($columns, [
                'cost_price',
                'description',
                'weight',
                'dimensions',
                'specifications',
                'gallery_urls',
            ]);
        }

        $query = Product::query()
            ->select($columns)
            ->with([
                'category:id,name,slug,parent_id',
                'category.parent:id,name',
                'brandRecord:id,name,slug,logo_url',
                'inventory:id,product_id,quantity_on_hand,quantity_reserved',
            ]);

        if (isset($filters['seller_id']) && is_numeric($filters['seller_id'])) {
            $query->where('seller_id', (int) $filters['seller_id']);
        }

        // Search by name, SKU, brand, or description
        if (! empty($filters['search'])) {
            $search = '%'.strtolower(trim($filters['search'])).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(sku) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(brand) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$search]);
            });
        }

        // Filter by status (active, archived, draft)
        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }
        if (array_key_exists('is_active', $filters)) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by category (including all nested subcategories!)
        $categoryParam = $filters['category_id'] ?? $filters['category'] ?? null;
        if (! empty($categoryParam)) {
            $category = is_numeric($categoryParam)
                ? Category::find((int) $categoryParam)
                : Category::where('slug', (string) $categoryParam)->first();

            if ($category) {
                // Resolve the complete tree in one query instead of calling
                // getAllDescendantIds(), which performs one query per level.
                $childrenByParent = Category::query()
                    ->whereNotNull('parent_id')
                    ->get(['id', 'parent_id'])
                    ->groupBy('parent_id');
                $categoryIds = [(int) $category->id => true];
                $pending = [(int) $category->id];

                while ($parentId = array_pop($pending)) {
                    foreach ($childrenByParent->get($parentId, collect()) as $child) {
                        $childId = (int) $child->id;
                        if (isset($categoryIds[$childId])) {
                            continue;
                        }

                        $categoryIds[$childId] = true;
                        $pending[] = $childId;
                    }
                }

                $categoryIds = array_keys($categoryIds);
                $query->where(function ($q) use ($categoryIds) {
                    $q->whereIn('category_id', $categoryIds)
                        ->orWhereHas('categories', function ($cq) use ($categoryIds) {
                            $cq->whereIn('categories.id', $categoryIds);
                        });
                });
            } else {
                // Never silently drop an invalid category filter. Returning
                // the complete catalog here makes a failed category link look
                // like a successful unfiltered search.
                $query->whereRaw('1 = 0');
            }
        }

        // Filter by brand
        if (! empty($filters['brand'])) {
            $query->where(function ($bq) use ($filters) {
                $bq->where('brand', $filters['brand'])
                    ->orWhereHas('brandRecord', fn ($br) => $br->where('slug', $filters['brand'])->orWhere('name', $filters['brand']));
            });
        }
        if (! empty($filters['brand_id']) && is_numeric($filters['brand_id'])) {
            $query->where('brand_id', (int) $filters['brand_id']);
        }

        // Filter by product flags
        if (isset($filters['is_featured'])) {
            $query->where('is_featured', filter_var($filters['is_featured'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($filters['is_new_arrival'])) {
            $query->where('is_new_arrival', filter_var($filters['is_new_arrival'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($filters['is_best_seller'])) {
            $query->where('is_best_seller', filter_var($filters['is_best_seller'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($filters['is_flash_sale'])) {
            $query->where('is_flash_sale', filter_var($filters['is_flash_sale'], FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by product_type (simple, variable, digital)
        if (! empty($filters['product_type']) && $filters['product_type'] !== 'all') {
            $query->where('product_type', $filters['product_type']);
        }

        // Price range filtering
        if (isset($filters['min_price']) && is_numeric($filters['min_price'])) {
            $query->where('selling_price', '>=', (float) $filters['min_price']);
        }
        if (isset($filters['max_price']) && is_numeric($filters['max_price'])) {
            $query->where('selling_price', '<=', (float) $filters['max_price']);
        }

        // Dynamic sorting
        $sortBy = $filters['sort_by'] ?? 'id';
        $sortDirection = strtolower($filters['sort_direction'] ?? $filters['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['id', 'name', 'selling_price', 'price', 'stock_quantity', 'created_at', 'rating', 'reviews_count'];

        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDirection);
        } else {
            $query->orderByDesc('id');
        }

        // Public card pages are read-heavy and can safely tolerate a short
        // cache window. Admin/seller lists keep the shorter window so recent
        // edits remain visible quickly.
        $cacheSeconds = $isCardView && ($filters['status'] ?? null) === 'active' ? 300 : 60;

        return $this->rememberRedis($cacheKey, $cacheSeconds, fn () => $query->paginate($perPage));
    }

    /**
     * Cache read-heavy catalog queries without making Redis a hard dependency
     * for local development or automated tests.
     */
    protected function rememberRedis(string $key, int $seconds, callable $callback): mixed
    {
        try {
            return Cache::store('redis')
                ->tags(['catalog'])
                ->remember($key, now()->addSeconds($seconds), $callback);
        } catch (\Throwable) {
            return $callback();
        }
    }

    /**
     * Create a new universal product with dynamic attributes and optional variants.
     */
    public function createProduct(array $data, ?int $userId = null): Product
    {
        $product = DB::transaction(function () use ($data, $userId) {
            $sellingPrice = (float) ($data['selling_price'] ?? $data['price'] ?? 0);
            $costPrice = (float) ($data['cost_price'] ?? 0);

            if ($sellingPrice < 0) {
                throw new InvalidArgumentException('Selling price cannot be negative.');
            }
            if ($costPrice < 0) {
                throw new InvalidArgumentException('Cost price cannot be negative.');
            }

            $slug = ! empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
            if (Product::where('slug', $slug)->exists()) {
                $slug .= '-'.Str::lower(Str::random(5));
            }

            $categoryId = ! empty($data['category_id']) ? (int) $data['category_id'] : null;

            // Validate category-specific required attributes
            if ($categoryId) {
                $this->validateCategoryAttributes($categoryId, $data['attributes'] ?? []);
            }

            $productType = $data['product_type'] ?? 'simple';
            $initialStock = max(0, (int) ($data['initial_stock'] ?? $data['stock_quantity'] ?? $data['quantity_on_hand'] ?? 0));

            $brandId = ! empty($data['brand_id']) ? (int) $data['brand_id'] : null;
            if (! $brandId && ! empty($data['brand'])) {
                $brandRecord = Brand::whereRaw('LOWER(name) = ?', [strtolower(trim($data['brand']))])
                    ->orWhere('slug', Str::slug($data['brand']))
                    ->first();
                if ($brandRecord) {
                    $brandId = $brandRecord->id;
                }
            }

            $sellerId = null;
            if ($userId) {
                $creator = User::with('roles')->find($userId);
                if ($creator && $creator->hasRole(['SELLER', 'SELLER_STAFF'])) {
                    $sellerId = $creator->id;
                }
            }

            $product = Product::create([
                'category_id' => $categoryId,
                'brand_id' => $brandId,
                'seller_id' => $sellerId,
                'name' => trim($data['name']),
                'brand' => ! empty($data['brand']) ? trim($data['brand']) : null,
                'slug' => $slug,
                'sku' => strtoupper(trim($data['sku'])),
                'product_type' => $productType,
                'description' => $data['description'] ?? null,
                'selling_price' => $sellingPrice,
                'cost_price' => $costPrice,
                'currency' => $data['currency'] ?? 'USD',
                'price' => $sellingPrice,
                'discount_price' => isset($data['discount_price']) && is_numeric($data['discount_price']) ? (float) $data['discount_price'] : null,
                'status' => $data['status'] ?? 'active',
                'stock_quantity' => $initialStock,
                'low_stock_threshold' => (int) ($data['low_stock_threshold'] ?? 5),
                'weight' => isset($data['weight']) ? (float) $data['weight'] : null,
                'dimensions' => $data['dimensions'] ?? null,
                'is_active' => ($data['status'] ?? 'active') === 'active',
                'is_featured' => ! empty($data['is_featured']),
                'is_new_arrival' => ! empty($data['is_new_arrival']),
                'is_best_seller' => ! empty($data['is_best_seller']),
                'is_flash_sale' => ! empty($data['is_flash_sale']),
                'image_url' => $data['image_url'] ?? null,
                'gallery_urls' => ! empty($data['gallery_urls']) && is_array($data['gallery_urls']) ? $data['gallery_urls'] : [],
                'specifications' => ! empty($data['specifications']) && is_array($data['specifications']) ? $data['specifications'] : null,
            ]);

            // Sync product_categories pivot
            if ($categoryId) {
                $product->categories()->attach($categoryId, ['is_primary' => true]);
            }
            if (! empty($data['category_ids']) && is_array($data['category_ids'])) {
                foreach ($data['category_ids'] as $extraCatId) {
                    if ($extraCatId != $categoryId && Category::where('id', $extraCatId)->exists()) {
                        $product->categories()->syncWithoutDetaching([$extraCatId => ['is_primary' => false]]);
                    }
                }
            }

            // Save dynamic category attribute values
            if (! empty($data['attributes']) && is_array($data['attributes'])) {
                $this->saveProductAttributeValues($product, $data['attributes']);
            }

            // Initialize Root Inventory record (for simple or root tracking)
            $inventory = Inventory::create([
                'product_id' => $product->id,
                'variant_id' => null,
                'quantity_on_hand' => $initialStock,
                'quantity_reserved' => 0,
            ]);

            if ($initialStock > 0) {
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'variant_id' => null,
                    'movement_type' => 'STOCK_IN',
                    'type' => 'stock_in',
                    'quantity_change' => $initialStock,
                    'before_quantity' => 0,
                    'after_quantity' => $initialStock,
                    'reason' => 'Initial stock on product creation',
                    'created_by' => $userId,
                    'user_id' => $userId,
                ]);
            }

            // If Variable Product, create variants with dedicated SKU-level inventories
            if ($productType === 'variable' && ! empty($data['variants']) && is_array($data['variants'])) {
                $this->createProductVariants($product, $data['variants'], $userId);
            }

            return $product->load([
                'category.parent',
                'categories',
                'brandRecord',
                'inventory',
                'variants.attributeValues.attribute',
                'variants.attributeValues.option',
                'variants.inventory',
                'attributeValues.attribute',
                'attributeValues.selectedOption',
            ]);
        });

        $this->flushCatalogCache();

        return $product;
    }

    /**
     * Update an existing product.
     */
    public function updateProduct(Product $product, array $data): Product
    {
        if (isset($data['selling_price']) && (float) $data['selling_price'] < 0) {
            throw new InvalidArgumentException('Selling price cannot be negative.');
        }
        if (isset($data['cost_price']) && (float) $data['cost_price'] < 0) {
            throw new InvalidArgumentException('Cost price cannot be negative.');
        }

            $updateData = [];

            if (array_key_exists('name', $data) && $data['name'] !== null) {
                $updateData['name'] = trim($data['name']);
            }
            if (array_key_exists('brand_id', $data)) {
                $updateData['brand_id'] = $data['brand_id'];
            }
            if (array_key_exists('brand', $data)) {
                $updateData['brand'] = $data['brand'] !== null ? trim($data['brand']) : null;
                if (! array_key_exists('brand_id', $data) && ! empty($data['brand'])) {
                    $brandRecord = Brand::whereRaw('LOWER(name) = ?', [strtolower(trim($data['brand']))])
                        ->orWhere('slug', Str::slug($data['brand']))
                        ->first();
                    $updateData['brand_id'] = $brandRecord ? $brandRecord->id : null;
                }
            }
            if (array_key_exists('sku', $data) && $data['sku'] !== null) {
                $updateData['sku'] = strtoupper(trim($data['sku']));
            }
            if (array_key_exists('product_type', $data)) {
                $updateData['product_type'] = $data['product_type'];
            }
            if (array_key_exists('description', $data)) {
                $updateData['description'] = $data['description'];
            }
            if (array_key_exists('selling_price', $data) && $data['selling_price'] !== null) {
                $updateData['selling_price'] = (float) $data['selling_price'];
                $updateData['price'] = (float) $data['selling_price'];
            }
            if (array_key_exists('cost_price', $data)) {
                $updateData['cost_price'] = $data['cost_price'] !== null ? (float) $data['cost_price'] : null;
            }
            if (array_key_exists('discount_price', $data)) {
                $updateData['discount_price'] = $data['discount_price'] !== null ? (float) $data['discount_price'] : null;
            }
            if (array_key_exists('currency', $data) && $data['currency'] !== null) {
                $updateData['currency'] = $data['currency'];
            }
            if (array_key_exists('status', $data) && $data['status'] !== null) {
                $updateData['status'] = $data['status'];
                $updateData['is_active'] = ($data['status'] === 'active');
            }
            if (array_key_exists('is_active', $data)) {
                $updateData['is_active'] = (bool) $data['is_active'];
            }
            if (array_key_exists('is_featured', $data)) {
                $updateData['is_featured'] = (bool) $data['is_featured'];
            }
            if (array_key_exists('is_new_arrival', $data)) {
                $updateData['is_new_arrival'] = (bool) $data['is_new_arrival'];
            }
            if (array_key_exists('is_best_seller', $data)) {
                $updateData['is_best_seller'] = (bool) $data['is_best_seller'];
            }
            if (array_key_exists('is_flash_sale', $data)) {
                $updateData['is_flash_sale'] = (bool) $data['is_flash_sale'];
            }
            if (array_key_exists('category_id', $data)) {
                $updateData['category_id'] = $data['category_id'];
            }
            if (array_key_exists('low_stock_threshold', $data) && $data['low_stock_threshold'] !== null) {
                $updateData['low_stock_threshold'] = (int) $data['low_stock_threshold'];
            }
            if (array_key_exists('weight', $data)) {
                $updateData['weight'] = $data['weight'] !== null ? (float) $data['weight'] : null;
            }
            if (array_key_exists('dimensions', $data)) {
                $updateData['dimensions'] = $data['dimensions'];
            }
            if (array_key_exists('image_url', $data)) {
                $updateData['image_url'] = $data['image_url'];
            }
            if (array_key_exists('gallery_urls', $data) && is_array($data['gallery_urls'])) {
                $updateData['gallery_urls'] = $data['gallery_urls'];
            }
            if (array_key_exists('specifications', $data)) {
                $updateData['specifications'] = $data['specifications'];
            }

            if (! empty($updateData)) {
                $updateData['updated_at'] = now();

                // Safely filter keys to existing table columns in Postgres
                $tableColumns = Schema::getColumnListing('products');
                $filteredUpdate = array_intersect_key($updateData, array_flip($tableColumns));

                if (! empty($filteredUpdate)) {
                    DB::table('products')->where('id', $product->id)->update($filteredUpdate);
                }
            }

            // Update attributes if provided
            if (isset($data['attributes']) && is_array($data['attributes'])) {
                $categoryId = $product->category_id;
                if ($categoryId) {
                    $this->validateCategoryAttributes($categoryId, $data['attributes']);
                }
                $this->saveProductAttributeValues($product, $data['attributes']);
            }

            // Update categories if provided
            if (isset($data['category_ids']) && is_array($data['category_ids'])) {
                $product->categories()->sync($data['category_ids']);
            }

        // Update variants if provided
        if (isset($data['variants']) && is_array($data['variants'])) {
            $this->syncProductVariants($product, $data['variants'], auth()->id());
        }

        // Fresh reload from database
        $fresh = Product::find($product->id);
        $resultProduct = $fresh ?: $product;

        $result = $resultProduct->load([
            'category.parent',
            'categories',
            'brandRecord',
            'inventory',
            'variants.attributeValues.attribute',
            'variants.attributeValues.option',
            'variants.inventory',
            'attributeValues.attribute',
            'attributeValues.selectedOption',
        ]);

        $this->flushCatalogCache();

        return $result;
    }

    /**
     * Validate that all required category attributes are supplied.
     */
    protected function validateCategoryAttributes(int $categoryId, array $attributes): void
    {
        $requiredAttributes = CategoryAttribute::where('category_id', $categoryId)
            ->where('is_required', true)
            ->get();

        if ($requiredAttributes->isEmpty()) {
            return;
        }

        // Index supplied attributes by attribute_id and code
        $supplied = [];
        foreach ($attributes as $attr) {
            $attrId = $attr['attribute_id'] ?? $attr['id'] ?? null;
            $code = $attr['code'] ?? null;
            $hasVal = ! empty($attr['value']) || ! empty($attr['selected_option_id']);

            if ($attrId && $hasVal) {
                $supplied[$attrId] = true;
            }
            if ($code && $hasVal) {
                $supplied[$code] = true;
            }
        }

        foreach ($requiredAttributes as $req) {
            if (empty($supplied[$req->id]) && empty($supplied[$req->code])) {
                throw new InvalidArgumentException("Category requires attribute '{$req->name}' ({$req->code}) to be specified.");
            }
        }
    }

    /**
     * Persist structured attribute values for a product.
     */
    protected function saveProductAttributeValues(Product $product, array $attributes): void
    {
        // Clear previous attributes and write fresh values
        $product->attributeValues()->delete();

        foreach ($attributes as $attr) {
            $attributeId = $attr['attribute_id'] ?? $attr['id'] ?? null;
            if (! $attributeId && ! empty($attr['code'])) {
                $attributeId = CategoryAttribute::where('code', $attr['code'])->value('id');
            }

            if (! $attributeId) {
                continue;
            }

            ProductAttributeValue::create([
                'product_id' => $product->id,
                'category_attribute_id' => $attributeId,
                'selected_option_id' => ! empty($attr['selected_option_id']) ? (int) $attr['selected_option_id'] : null,
                'value' => ! empty($attr['value']) ? (string) $attr['value'] : null,
            ]);
        }
    }

    /**
     * Create product variants with unique SKU validation and SKU-level inventory records.
     */
    protected function createProductVariants(Product $product, array $variants, ?int $userId = null): void
    {
        $totalVariantStock = 0;

        foreach ($variants as $varData) {
            $sku = strtoupper(trim($varData['sku']));

            if (ProductVariant::where('sku', $sku)->exists() || Product::where('sku', $sku)->where('id', '!=', $product->id)->exists()) {
                throw new InvalidArgumentException("Variant SKU '{$sku}' already exists in catalog. Each variant must possess a unique SKU.");
            }

            $varStock = max(0, (int) ($varData['stock_quantity'] ?? $varData['initial_stock'] ?? 0));
            $totalVariantStock += $varStock;

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => $sku,
                'name' => trim($varData['name']),
                'selling_price' => (float) ($varData['selling_price'] ?? $product->selling_price),
                'cost_price' => (float) ($varData['cost_price'] ?? $product->cost_price),
                'stock_quantity' => $varStock,
                'low_stock_threshold' => (int) ($varData['low_stock_threshold'] ?? 5),
                'image_url' => $varData['image_url'] ?? null,
                'is_active' => $varData['is_active'] ?? true,
            ]);

            // Save variant attribute options (e.g., Size=M, Color=Red)
            if (! empty($varData['attribute_values']) && is_array($varData['attribute_values'])) {
                foreach ($varData['attribute_values'] as $vAttr) {
                    $attrId = $vAttr['attribute_id'] ?? null;
                    if (! $attrId && ! empty($vAttr['code'])) {
                        $attrId = CategoryAttribute::where('code', $vAttr['code'])->value('id');
                    }
                    if (! $attrId) {
                        continue;
                    }

                    VariantAttributeValue::create([
                        'product_variant_id' => $variant->id,
                        'category_attribute_id' => $attrId,
                        'attribute_option_id' => ! empty($vAttr['option_id']) ? (int) $vAttr['option_id'] : null,
                        'custom_value' => ! empty($vAttr['custom_value']) ? (string) $vAttr['custom_value'] : null,
                    ]);
                }
            }

            // Initialize SKU-level inventory for this variant
            Inventory::create([
                'product_id' => $product->id,
                'variant_id' => $variant->id,
                'quantity_on_hand' => $varStock,
                'quantity_reserved' => 0,
            ]);

            if ($varStock > 0) {
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'movement_type' => 'STOCK_IN',
                    'type' => 'stock_in',
                    'quantity_change' => $varStock,
                    'before_quantity' => 0,
                    'after_quantity' => $varStock,
                    'reason' => "Initial stock for variant SKU '{$sku}'",
                    'created_by' => $userId,
                    'user_id' => $userId,
                ]);
            }
        }

        // Synchronize parent product total stock quantity with sum of variants
        $product->update(['stock_quantity' => $totalVariantStock]);
    }

    /**
     * Synchronize product variants for variable products during product update.
     */
    protected function syncProductVariants(Product $product, array $variants, ?int $userId = null): void
    {
        $existingVariants = $product->variants()->get()->keyBy('id');

        foreach ($variants as $varData) {
            $variantId = $varData['id'] ?? null;
            $sku = strtoupper(trim($varData['sku']));

            // Validate SKU uniqueness
            $skuQuery = ProductVariant::where('sku', $sku);
            if ($variantId) {
                $skuQuery->where('id', '!=', $variantId);
            }
            if ($skuQuery->exists() || Product::where('sku', $sku)->where('id', '!=', $product->id)->exists()) {
                throw new InvalidArgumentException("Variant SKU '{$sku}' already exists in catalog. Each variant must possess a unique SKU.");
            }

            if ($variantId && isset($existingVariants[$variantId])) {
                // Update existing variant
                $variant = $existingVariants[$variantId];
                $newStock = isset($varData['stock_quantity'])
                    ? (int) $varData['stock_quantity']
                    : (isset($varData['initial_stock']) ? (int) $varData['initial_stock'] : $variant->stock_quantity);

                $variant->update([
                    'sku' => $sku,
                    'name' => trim($varData['name'] ?? $variant->name),
                    'selling_price' => (float) ($varData['selling_price'] ?? $variant->selling_price),
                    'cost_price' => isset($varData['cost_price']) ? (float) $varData['cost_price'] : $variant->cost_price,
                    'low_stock_threshold' => (int) ($varData['low_stock_threshold'] ?? $variant->low_stock_threshold),
                    'image_url' => $varData['image_url'] ?? $variant->image_url,
                    'is_active' => isset($varData['is_active']) ? (bool) $varData['is_active'] : $variant->is_active,
                ]);

                // Adjust SKU-level inventory
                $inv = Inventory::firstOrCreate(
                    ['product_id' => $product->id, 'variant_id' => $variant->id],
                    ['quantity_on_hand' => 0, 'quantity_reserved' => 0]
                );

                if ($newStock !== $inv->quantity_on_hand) {
                    $diff = $newStock - $inv->quantity_on_hand;
                    $inv->update(['quantity_on_hand' => $newStock]);
                    $variant->update(['stock_quantity' => $newStock]);

                    InventoryMovement::create([
                        'product_id' => $product->id,
                        'variant_id' => $variant->id,
                        'movement_type' => $diff > 0 ? 'STOCK_IN' : 'ADJUSTMENT',
                        'type' => $diff > 0 ? 'stock_in' : 'adjustment',
                        'quantity_change' => $diff,
                        'before_quantity' => $inv->quantity_on_hand - $diff,
                        'after_quantity' => $newStock,
                        'reason' => 'Variant stock updated via product edit',
                        'created_by' => $userId,
                        'user_id' => $userId,
                    ]);
                }
            } else {
                // Create brand new variant
                $varStock = max(0, (int) ($varData['stock_quantity'] ?? $varData['initial_stock'] ?? 0));
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'sku' => $sku,
                    'name' => trim($varData['name']),
                    'selling_price' => (float) ($varData['selling_price'] ?? $product->selling_price),
                    'cost_price' => (float) ($varData['cost_price'] ?? $product->cost_price),
                    'stock_quantity' => $varStock,
                    'low_stock_threshold' => (int) ($varData['low_stock_threshold'] ?? 5),
                    'image_url' => $varData['image_url'] ?? null,
                    'is_active' => $varData['is_active'] ?? true,
                ]);

                // Initialize SKU inventory
                Inventory::create([
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity_on_hand' => $varStock,
                    'quantity_reserved' => 0,
                ]);

                if ($varStock > 0) {
                    InventoryMovement::create([
                        'product_id' => $product->id,
                        'variant_id' => $variant->id,
                        'movement_type' => 'STOCK_IN',
                        'type' => 'stock_in',
                        'quantity_change' => $varStock,
                        'before_quantity' => 0,
                        'after_quantity' => $varStock,
                        'reason' => "Initial stock for variant SKU '{$sku}'",
                        'created_by' => $userId,
                        'user_id' => $userId,
                    ]);
                }
            }

            // Sync variant attribute values if provided
            if (! empty($varData['attribute_values']) && is_array($varData['attribute_values'])) {
                $variant->attributeValues()->delete();
                foreach ($varData['attribute_values'] as $vAttr) {
                    $attrId = $vAttr['attribute_id'] ?? null;
                    if (! $attrId && ! empty($vAttr['code'])) {
                        $attrId = CategoryAttribute::where('code', $vAttr['code'])->value('id');
                    }
                    if (! $attrId) {
                        continue;
                    }

                    VariantAttributeValue::create([
                        'product_variant_id' => $variant->id,
                        'category_attribute_id' => $attrId,
                        'attribute_option_id' => ! empty($vAttr['option_id']) ? (int) $vAttr['option_id'] : null,
                        'custom_value' => ! empty($vAttr['custom_value']) ? (string) $vAttr['custom_value'] : null,
                    ]);
                }
            }
        }

        // Calculate and update total parent stock quantity
        $totalActiveStock = (int) $product->variants()->where('is_active', true)->sum('stock_quantity');
        $product->update(['stock_quantity' => $totalActiveStock]);
    }

    /**
     * Safe archive product instead of permanent deletion.
     */
    public function archiveProduct(Product $product): Product
    {
        $product->archive();
        $this->flushCatalogCache();

        return $product;
    }

    /**
     * Invalidate catalog pages after a product mutation.
     */
    protected function flushCatalogCache(): void
    {
        try {
            Cache::store('redis')->tags(['catalog'])->flush();
        } catch (\Throwable) {
            // Cache invalidation must never make a successful mutation fail.
        }
    }
}
