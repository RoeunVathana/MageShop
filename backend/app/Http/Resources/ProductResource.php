<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user && ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('FINANCE_MANAGER') || $user->hasRole('ACCOUNTANT') || $user->hasRole('INVENTORY_MANAGER'));

        $hasBrand = $this->relationLoaded('brandRecord') && $this->brandRecord;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'brand_id' => $this->brand_id,
            'brand' => $this->brand ?? ($hasBrand ? $this->brandRecord->name : null),
            'brand_record' => $hasBrand ? [
                'id' => $this->brandRecord->id,
                'name' => $this->brandRecord->name,
                'slug' => $this->brandRecord->slug,
                'logo_url' => $this->brandRecord->logo_url,
            ] : null,
            'sku' => $this->sku,
            'slug' => $this->slug,
            'product_type' => $this->product_type ?? 'simple',
            'description' => $this->description,
            'selling_price' => (float) ($this->selling_price ?? $this->price ?? 0),
            'cost_price' => $canViewCost ? (float) ($this->cost_price ?? 0) : null,
            'currency' => $this->currency ?? 'USD',
            'price' => (float) ($this->price ?? $this->selling_price ?? 0),
            'discount_price' => $this->discount_price ? (float) $this->discount_price : null,
            'status' => $this->status ?? ($this->is_active ? 'active' : 'draft'),
            'is_active' => (bool) $this->is_active,
            'is_featured' => (bool) $this->is_featured,
            'is_new_arrival' => (bool) $this->is_new_arrival,
            'is_best_seller' => (bool) $this->is_best_seller,
            'is_flash_sale' => (bool) $this->is_flash_sale,
            'rating' => (float) ($this->rating ?? 0),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'stock_quantity' => (int) ($this->stock_quantity ?? 0),
            'available_stock' => (int) $this->available_stock,
            'quantity_on_hand' => (int) ($this->relationLoaded('inventory') && $this->inventory ? $this->inventory->quantity_on_hand : ($this->stock_quantity ?? 0)),
            'quantity_reserved' => (int) ($this->relationLoaded('inventory') && $this->inventory ? $this->inventory->quantity_reserved : 0),
            'low_stock_threshold' => (int) ($this->low_stock_threshold ?? 5),
            'weight' => $this->weight ? (float) $this->weight : null,
            'dimensions' => $this->dimensions,
            'specifications' => $this->specifications,
            'category' => $this->relationLoaded('category') && $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
                'parent_id' => $this->category->parent_id,
                'parent_name' => $this->category->relationLoaded('parent') ? $this->category->parent?->name : null,
            ] : ($this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
                'parent_id' => $this->category->parent_id,
                'parent_name' => null,
            ] : null),
            'categories' => $this->relationLoaded('categories')
                ? $this->categories->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'is_primary' => (bool) ($c->pivot->is_primary ?? false),
                ])
                : [],
            'attributes' => $this->relationLoaded('attributeValues')
                ? $this->attributeValues->map(fn ($val) => [
                    'id' => $val->id,
                    'attribute_id' => $val->category_attribute_id,
                    'name' => $val->attribute?->name,
                    'code' => $val->attribute?->code,
                    'type' => $val->attribute?->type,
                    'value' => $val->value,
                    'selected_option_id' => $val->selected_option_id,
                    'display_value' => $val->display_value,
                ])
                : [],
            'variants' => $this->relationLoaded('variants')
                ? ProductVariantResource::collection($this->variants)
                : [],
            'image_url' => $this->image_url,
            'gallery_urls' => $this->gallery_urls ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
