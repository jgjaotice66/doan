<?php

namespace App\Http\Resources;

use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CartItem
 */
class CartItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $reason = $this->unavailableReason();
        $discontinued = $this->product === null || $this->product->trashed();

        return [
            'id' => $this->id,
            'quantity' => $this->quantity,
            'line_total' => $this->line_total,
            // Giới hạn cho ô chọn số lượng ở frontend.
            'max_quantity' => $discontinued ? 0 : $this->product->stock,
            'unavailable' => $reason !== null,
            'unavailable_reason' => $reason,
            'product' => new ProductResource($this->product),
        ];
    }
}
