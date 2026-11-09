<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = $this->route('product');
        $user = $this->user('sanctum') ?: $this->user();
        if (! $user) {
            return false;
        }

        return $user->can('update', $product)
            || $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER'])
            || in_array(strtolower($user->email ?? ''), ['vothanarern@gmail.com', 'admin@megacommerce.com'], true);
    }

    public function rules(): array
    {
        $product = $this->route('product');
        $productId = $product instanceof Product ? $product->id : $product;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'brand' => ['nullable', 'string', 'max:100'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'product_type' => ['nullable', 'string', 'in:simple,variable,digital,bundle'],
            'description' => ['nullable', 'string'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'discount_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
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
            'variants' => ['nullable', 'array'],
        ];
    }
}
