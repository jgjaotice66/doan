<?php

namespace App\Http\Resources;

use App\Models\Category;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'image' => Media::url($this->image),
            'low_stock_threshold' => $this->low_stock_threshold,
            'products_count' => $this->whenCounted('products'),
            'parent' => $this->whenLoaded('parent', fn () => $this->parent ? ['id' => $this->parent->id, 'name' => $this->parent->name] : null),
            'children' => CategoryResource::collection($this->whenLoaded('children')),
        ];
    }
}
