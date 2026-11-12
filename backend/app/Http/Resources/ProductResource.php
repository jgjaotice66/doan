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
            // Ảnh thứ 2 hiện khi di chuột lên thẻ sản phẩm (null nếu chỉ có 1 ảnh).
            'hover_image' => $this->whenLoaded('images', fn () => Media::url($this->images->get(1)?->path)),
            'in_stock' => $this->stock > 0,
            'low_stock' => $this->stock > 0 && $this->isLowStock(),
            'min_age' => $this->min_age,
            'is_featured' => $this->is_featured,
            'brand' => new BrandResource($this->whenLoaded('brand')),
        ];
    }
}
