<?php

namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryAttributeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user ? $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER']) : false;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100'],
            'type' => ['sometimes', 'required', 'string', 'in:text,number,select,multiselect,boolean,date'],
            'is_required' => ['nullable', 'boolean'],
            'is_filterable' => ['nullable', 'boolean'],
            'is_variant_option' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
            'options' => ['nullable', 'array'],
        ];
    }
}
