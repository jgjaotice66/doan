<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Sản phẩm cho khu quản trị: đủ trường để sửa (sku, mô tả, tồn kho, trạng thái, ảnh có id).
 *
 * @mixin Product
 */
class AdminProductResource extends JsonResource
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
            'sku' => $this->sku,
            'description' => $this->description,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'final_price' => $this->final_price,
            'stock' => $this->stock,
            'low_stock' => $this->isLowStock(),
            // Giá trị tự đặt cho riêng sản phẩm (null = kế thừa) + ngưỡng đang áp dụng và nguồn của nó.
            'low_stock_threshold' => $this->low_stock_threshold,
            'effective_low_stock_threshold' => $this->lowStockThreshold(),
            'min_age' => $this->min_age,
            'is_featured' => $this->is_featured,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'category' => $this->whenLoaded('category', fn () => ['id' => $this->category->id, 'name' => $this->category->name]),
            'brand' => $this->whenLoaded('brand', fn () => ['id' => $this->brand->id, 'name' => $this->brand->name]),
            'thumbnail' => $this->whenLoaded('images', fn () => Media::url($this->images->first()?->path)),
            'images' => $this->whenLoaded('images', fn () => ProductImageResource::collection($this->images)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
