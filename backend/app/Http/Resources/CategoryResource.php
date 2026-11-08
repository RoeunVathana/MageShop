<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'parent_id' => $this->parent_id,
            'parent_name' => $this->relationLoaded('parent') ? $this->parent?->name : null,
            'icon' => $this->icon,
            'image_url' => $this->image_url,
            'description' => $this->description,
            'sort_order' => (int) $this->sort_order,
            'is_active' => (bool) $this->is_active,
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'seo_keywords' => $this->seo_keywords,
            'products_count' => $this->whenCounted('products', fn () => $this->products_count),
            'children' => CategoryResource::collection($this->whenLoaded('children')),
            'attributes' => CategoryAttributeResource::collection($this->whenLoaded('attributes')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

