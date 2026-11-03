<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\Request;

/**
 * Đầy đủ thông tin cho trang chi tiết sản phẩm.
 *
 * @mixin Product
 */
class ProductDetailResource extends ProductResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'sku' => $this->sku,
            'description' => $this->description,
            'stock' => $this->stock,
            'images' => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => Media::url($image->path),
            ]),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'is_wishlisted' => (bool) $this->is_wishlisted,
            'related' => ProductResource::collection($this->whenLoaded('related')),
        ];
    }
}
