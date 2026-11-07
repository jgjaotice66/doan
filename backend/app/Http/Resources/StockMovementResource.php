<?php

namespace App\Http\Resources;

use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Một dòng lịch sử kho (admin).
 *
 * @mixin StockMovement
 */
class StockMovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'change' => $this->change,
            'reason' => ['value' => $this->reason->value, 'label' => $this->reason->label()],
            'note' => $this->note,
            'product' => $this->whenLoaded('product', fn () => $this->product ? [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'sku' => $this->product->sku,
                'deleted' => $this->product->trashed(),
            ] : null),
            'order' => $this->whenLoaded('order', fn () => $this->order ? ['id' => $this->order->id, 'code' => $this->order->code] : null),
            'user' => $this->whenLoaded('user', fn () => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null),
            'created_at' => $this->created_at,
        ];
    }
}
