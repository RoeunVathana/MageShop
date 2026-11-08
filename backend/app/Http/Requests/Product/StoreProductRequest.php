<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Product::class)
            ?? $this->user()?->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER'])
            ?? false;
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
            'image_url' => ['nullable', 'string', 'max:500'],
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
