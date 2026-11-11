<?php

namespace App\Http\Requests\Brand;

use Illuminate\Foundation\Http\FormRequest;

class StoreBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user('sanctum') ?: $this->user();

        return $user && $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'STAFF', 'SELLER']);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'slug' => 'nullable|string|max:120|unique:brands,slug',
            'logo_url' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'country' => 'nullable|string|max:100',
            'website' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive,archived',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string|max:500',
            'seo_keywords' => 'nullable|string|max:255',
            'translations' => 'nullable|array',
            'translations.*.locale' => 'required_with:translations|string|in:en,km',
            'translations.*.name' => 'required_with:translations|string|max:100',
            'translations.*.description' => 'nullable|string|max:1000',
        ];
    }
}
