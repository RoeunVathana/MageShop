<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryAttributeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type,
            'is_required' => (bool) $this->is_required,
            'is_filterable' => (bool) $this->is_filterable,
            'is_variant_option' => (bool) $this->is_variant_option,
            'sort_order' => (int) $this->sort_order,
            'validation_rules' => $this->validation_rules,
            'options' => $this->relationLoaded('options')
                ? $this->options->map(fn ($opt) => [
                    'id' => $opt->id,
                    'value' => $opt->value,
                    'label' => $opt->label,
                    'sort_order' => (int) $opt->sort_order,
                ])
                : [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
