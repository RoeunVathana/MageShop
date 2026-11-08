<?php

namespace App\Http\Requests\Brand;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('PRODUCT_MANAGER') || $user->hasRole('STAFF'));
    }

    public function rules(): array
    {
        $brand = $this->route('brand');
        $brandId = $brand instanceof \App\Models\Brand ? $brand->id : $brand;

        return [
            'name' => 'sometimes|required|string|max:100',
            'slug' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('brands', 'slug')->ignore($brandId)],
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

