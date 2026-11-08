<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = $this->route('product');
        return $this->user()?->can('update', $product)
            ?? $this->user()?->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER'])
            ?? false;
    }

    public function rules(): array
    {
        $product = $this->route('product');
        $productId = $product instanceof \App\Models\Product ? $product->id : $product;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'brand' => ['nullable', 'string', 'max:100'],
            'product_type' => ['nullable', 'string', 'in:simple,variable,digital,bundle'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'dimensions' => ['nullable', 'array'],
            'status' => ['nullable', 'in:active,draft,archived'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'attributes' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
        ];
    }
}
