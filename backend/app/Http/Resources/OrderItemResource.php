<?php

namespace App\Http\Resources;

use App\Models\OrderItem;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderItem
 */
class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->whenLoaded('product', fn () => $this->product);

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            // Tên/giá là bản chụp lúc đặt, không lấy từ sản phẩm hiện tại.
            'product_name' => $this->product_name,
            'price' => $this->price,
            'quantity' => $this->quantity,
            'line_total' => $this->line_total,
            // Chỉ để hiển thị/link; sản phẩm có thể đã bị xoá.
            'product_slug' => $product?->slug,
            'thumbnail' => $product ? Media::url($product->images->first()?->path) : null,
        ];
    }
}
