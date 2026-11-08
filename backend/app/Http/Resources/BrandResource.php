<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_url' => $this->logo_url,
            'description' => $this->description,
            'country' => $this->country,
            'website' => $this->website,
            'status' => $this->status,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'seo_keywords' => $this->seo_keywords,
            'products_count' => $this->whenCounted('products'),
            'translations' => $this->whenLoaded('translations', function () {
                return $this->translations->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'locale' => $t->locale,
                        'name' => $t->name,
                        'description' => $t->description,
                    ];
                });
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

