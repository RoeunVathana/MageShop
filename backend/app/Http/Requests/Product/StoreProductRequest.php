<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    /**
     * Normalize values before the unique rule runs. ProductService stores
     * uppercase SKUs, so validation must compare the same canonical value or
     * a lowercase duplicate can pass validation and fail later with a 500.
     */
    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['name', 'brand'] as $field) {
            if (is_string($this->input($field))) {
                $normalized[$field] = trim((string) $this->input($field));
            }
        }

        if (is_string($this->input('sku'))) {
            $normalized['sku'] = strtoupper(trim((string) $this->input('sku')));
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }

    public function authorize(): bool
    {
        $user = $this->user('sanctum') ?: $this->user();
        if (! $user) {
            return false;
        }

        return $user->can('create', Product::class)
            || $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'SELLER', 'SELLER_STAFF']);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'brand' => ['nullable', 'string', 'max:100'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'product_type' => ['nullable', 'string', 'in:simple,variable,digital,bundle'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'discount_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'initial_stock' => ['nullable', 'integer', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'dimensions' => ['nullable', 'array'],
            'status' => ['nullable', 'in:active,draft,archived'],
            'is_active' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'is_new_arrival' => ['nullable', 'boolean'],
            'is_best_seller' => ['nullable', 'boolean'],
            'is_flash_sale' => ['nullable', 'boolean'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'gallery_urls' => ['nullable', 'array'],
            'gallery_urls.*' => ['string', 'max:500'],
            'specifications' => ['nullable', 'array'],
            'attributes' => ['nullable', 'array'],
            'attributes.*.attribute_id' => ['nullable', 'integer'],
            'attributes.*.code' => ['nullable', 'string'],
            'attributes.*.value' => ['nullable'],
            'attributes.*.selected_option_id' => ['nullable', 'integer'],
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['required_with:variants', 'string', 'max:100'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:255'],
            'variants.*.selling_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.initial_stock' => ['nullable', 'integer', 'min:0'],
            'variants.*.attribute_values' => ['nullable', 'array'],
        ];
    }
}
