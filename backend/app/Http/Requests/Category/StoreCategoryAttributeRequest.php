<?php

namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoryAttributeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER']) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100'],
            'type' => ['required', 'string', 'in:text,number,select,multiselect,boolean,date'],
            'is_required' => ['nullable', 'boolean'],
            'is_filterable' => ['nullable', 'boolean'],
            'is_variant_option' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
            'options' => ['nullable', 'array'],
            'options.*.value' => ['required_with:options', 'string'],
            'options.*.label' => ['required_with:options', 'string'],
            'options.*.sort_order' => ['nullable', 'integer'],
        ];
    }
}

