<?php

namespace App\Services\Product;

use App\Models\Category;
use App\Models\CategoryAttribute;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Models\VariantAttributeValue;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ProductService
{
    /**
     * List products with multi-category hierarchy filtering, search, status, and pagination.
     */
    public function listProducts(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Product::with([
            'category.parent',
            'categories',
            'inventory',
            'variants.attributeValues.attribute',
            'variants.attributeValues.option',
            'variants.inventory',
            'attributeValues.attribute',
            'attributeValues.selectedOption',
        ]);

        // Search by name, SKU, brand, or description
        if (!empty($filters['search'])) {
            $search = '%' . strtolower(trim($filters['search'])) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(sku) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(brand) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(description) LIKE ?', [$search]);
            });
        }

        // Filter by status (active, archived, draft)
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        // Filter by category (including all nested subcategories!)
        if (!empty($filters['category_id'])) {
            $category = Category::find($filters['category_id']);
            if ($category) {
                $categoryIds = array_merge([$category->id], $category->getAllDescendantIds());
                $query->where(function ($q) use ($categoryIds) {
                    $q->whereIn('category_id', $categoryIds)
                      ->orWhereHas('categories', function ($cq) use ($categoryIds) {
                          $cq->whereIn('categories.id', $categoryIds);
                      });
                });
            } else {
                $query->where('category_id', $filters['category_id']);
            }
        }

        // Filter by brand
        if (!empty($filters['brand'])) {
            $query->where('brand', $filters['brand']);
        }

        // Filter by product_type (simple, variable, digital)
        if (!empty($filters['product_type']) && $filters['product_type'] !== 'all') {
            $query->where('product_type', $filters['product_type']);
        }

        // Price range filtering
        if (isset($filters['min_price']) && is_numeric($filters['min_price'])) {
            $query->where('selling_price', '>=', (float) $filters['min_price']);
        }
        if (isset($filters['max_price']) && is_numeric($filters['max_price'])) {
            $query->where('selling_price', '<=', (float) $filters['max_price']);
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    /**
     * Create a new universal product with dynamic attributes and optional variants.
     */
    public function createProduct(array $data, ?int $userId = null): Product
    {
        return DB::transaction(function () use ($data, $userId) {
            $sellingPrice = (float) ($data['selling_price'] ?? $data['price'] ?? 0);
            $costPrice = (float) ($data['cost_price'] ?? 0);

            if ($sellingPrice < 0) {
                throw new InvalidArgumentException('Selling price cannot be negative.');
            }
            if ($costPrice < 0) {
                throw new InvalidArgumentException('Cost price cannot be negative.');
            }

            $slug = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);
            if (Product::where('slug', $slug)->exists()) {
                $slug .= '-' . Str::lower(Str::random(5));
            }

            $categoryId = !empty($data['category_id']) ? (int) $data['category_id'] : null;

            // Validate category-specific required attributes
            if ($categoryId) {
                $this->validateCategoryAttributes($categoryId, $data['attributes'] ?? []);
            }

            $productType = $data['product_type'] ?? 'simple';
            $initialStock = max(0, (int) ($data['initial_stock'] ?? $data['stock_quantity'] ?? $data['quantity_on_hand'] ?? 0));

            $product = Product::create([
                'category_id' => $categoryId,
                'name' => trim($data['name']),
                'brand' => !empty($data['brand']) ? trim($data['brand']) : null,
                'slug' => $slug,
                'sku' => strtoupper(trim($data['sku'])),
                'product_type' => $productType,
                'description' => $data['description'] ?? null,
                'selling_price' => $sellingPrice,
                'cost_price' => $costPrice,
                'currency' => $data['currency'] ?? 'USD',
                'price' => $sellingPrice,
                'status' => $data['status'] ?? 'active',
                'stock_quantity' => $initialStock,
                'low_stock_threshold' => (int) ($data['low_stock_threshold'] ?? 5),
                'weight' => isset($data['weight']) ? (float) $data['weight'] : null,
                'dimensions' => $data['dimensions'] ?? null,
                'is_active' => ($data['status'] ?? 'active') === 'active',
                'image_url' => $data['image_url'] ?? null,
            ]);

            // Sync product_categories pivot
            if ($categoryId) {
                $product->categories()->attach($categoryId, ['is_primary' => true]);
            }
            if (!empty($data['category_ids']) && is_array($data['category_ids'])) {
                foreach ($data['category_ids'] as $extraCatId) {
                    if ($extraCatId != $categoryId && Category::where('id', $extraCatId)->exists()) {
                        $product->categories()->syncWithoutDetaching([$extraCatId => ['is_primary' => false]]);
                    }
                }
            }

            // Save dynamic category attribute values
            if (!empty($data['attributes']) && is_array($data['attributes'])) {
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
            if ($productType === 'variable' && !empty($data['variants']) && is_array($data['variants'])) {
                $this->createProductVariants($product, $data['variants'], $userId);
            }

            return $product->load([
                'category.parent',
                'categories',
                'inventory',
                'variants.attributeValues.attribute',
                'variants.attributeValues.option',
                'variants.inventory',
                'attributeValues.attribute',
                'attributeValues.selectedOption',
            ]);
        });
    }

    /**
     * Update an existing product.
     */
    public function updateProduct(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            if (isset($data['selling_price']) && (float) $data['selling_price'] < 0) {
                throw new InvalidArgumentException('Selling price cannot be negative.');
            }
            if (isset($data['cost_price']) && (float) $data['cost_price'] < 0) {
                throw new InvalidArgumentException('Cost price cannot be negative.');
            }

            $updateData = [];

            if (isset($data['name'])) {
                $updateData['name'] = trim($data['name']);
            }
            if (isset($data['brand'])) {
                $updateData['brand'] = trim($data['brand']);
            }
            if (isset($data['sku'])) {
                $updateData['sku'] = strtoupper(trim($data['sku']));
            }
            if (isset($data['product_type'])) {
                $updateData['product_type'] = $data['product_type'];
            }
            if (isset($data['description'])) {
                $updateData['description'] = $data['description'];
            }
            if (isset($data['selling_price'])) {
                $updateData['selling_price'] = (float) $data['selling_price'];
                $updateData['price'] = (float) $data['selling_price'];
            }
            if (isset($data['cost_price'])) {
                $updateData['cost_price'] = (float) $data['cost_price'];
            }
            if (isset($data['currency'])) {
                $updateData['currency'] = $data['currency'];
            }
            if (isset($data['status'])) {
                $updateData['status'] = $data['status'];
                $updateData['is_active'] = ($data['status'] === 'active');
            }
            if (isset($data['category_id'])) {
                $updateData['category_id'] = $data['category_id'];
            }
            if (isset($data['low_stock_threshold'])) {
                $updateData['low_stock_threshold'] = (int) $data['low_stock_threshold'];
            }
            if (isset($data['weight'])) {
                $updateData['weight'] = (float) $data['weight'];
            }
            if (isset($data['dimensions'])) {
                $updateData['dimensions'] = $data['dimensions'];
            }
            if (isset($data['image_url'])) {
                $updateData['image_url'] = $data['image_url'];
            }

            $product->update($updateData);

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

            return $product->load([
                'category.parent',
                'categories',
                'inventory',
                'variants.attributeValues.attribute',
                'variants.attributeValues.option',
                'variants.inventory',
                'attributeValues.attribute',
                'attributeValues.selectedOption',
            ]);
        });
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
            $hasVal = !empty($attr['value']) || !empty($attr['selected_option_id']);

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
            if (!$attributeId && !empty($attr['code'])) {
                $attributeId = CategoryAttribute::where('code', $attr['code'])->value('id');
            }

            if (!$attributeId) continue;

            ProductAttributeValue::create([
                'product_id' => $product->id,
                'category_attribute_id' => $attributeId,
                'selected_option_id' => !empty($attr['selected_option_id']) ? (int) $attr['selected_option_id'] : null,
                'value' => !empty($attr['value']) ? (string) $attr['value'] : null,
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
            if (!empty($varData['attribute_values']) && is_array($varData['attribute_values'])) {
                foreach ($varData['attribute_values'] as $vAttr) {
                    $attrId = $vAttr['attribute_id'] ?? null;
                    if (!$attrId && !empty($vAttr['code'])) {
                        $attrId = CategoryAttribute::where('code', $vAttr['code'])->value('id');
                    }
                    if (!$attrId) continue;

                    VariantAttributeValue::create([
                        'product_variant_id' => $variant->id,
                        'category_attribute_id' => $attrId,
                        'attribute_option_id' => !empty($vAttr['option_id']) ? (int) $vAttr['option_id'] : null,
                        'custom_value' => !empty($vAttr['custom_value']) ? (string) $vAttr['custom_value'] : null,
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
                        'reason' => "Variant stock updated via product edit",
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
            if (!empty($varData['attribute_values']) && is_array($varData['attribute_values'])) {
                $variant->attributeValues()->delete();
                foreach ($varData['attribute_values'] as $vAttr) {
                    $attrId = $vAttr['attribute_id'] ?? null;
                    if (!$attrId && !empty($vAttr['code'])) {
                        $attrId = CategoryAttribute::where('code', $vAttr['code'])->value('id');
                    }
                    if (!$attrId) continue;

                    VariantAttributeValue::create([
                        'product_variant_id' => $variant->id,
                        'category_attribute_id' => $attrId,
                        'attribute_option_id' => !empty($vAttr['option_id']) ? (int) $vAttr['option_id'] : null,
                        'custom_value' => !empty($vAttr['custom_value']) ? (string) $vAttr['custom_value'] : null,
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
        return $product;
    }
}
