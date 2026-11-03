<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Dạng thẻ sản phẩm dùng cho danh sách.
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'final_price' => $this->final_price,
            'thumbnail' => $this->whenLoaded('images', fn () => Media::url($this->images->first()?->path)),
            'in_stock' => $this->stock > 0,
            'min_age' => $this->min_age,
            'is_featured' => $this->is_featured,
            'brand' => new BrandResource($this->whenLoaded('brand')),
        ];
    }
}
