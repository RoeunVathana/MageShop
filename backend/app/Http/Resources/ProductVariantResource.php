<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user && ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('FINANCE_MANAGER') || $user->hasRole('ACCOUNTANT') || $user->hasRole('INVENTORY_MANAGER'));

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'selling_price' => (float) $this->selling_price,
            'cost_price' => $canViewCost ? (float) $this->cost_price : null,
            'stock_quantity' => (int) $this->stock_quantity,
            'available_stock' => (int) $this->available_stock,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'image_url' => $this->image_url,
            'is_active' => (bool) $this->is_active,
            'attribute_values' => $this->relationLoaded('attributeValues')
                ? $this->attributeValues->map(fn ($val) => [
                    'attribute_id' => $val->category_attribute_id,
                    'attribute_name' => $val->attribute ? $val->attribute->name : null,
                    'attribute_code' => $val->attribute ? $val->attribute->code : null,
                    'option_id' => $val->attribute_option_id,
                    'value' => $val->custom_value,
                    'display_value' => $val->display_value,
                ])
                : [],
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
        ];
    }
}
