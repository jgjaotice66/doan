<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Support\VietQr;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // QR chỉ cần khi chọn chuyển khoản, chưa trả tiền và đơn chưa huỷ.
        $needsQr = $this->awaitsTransfer();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'payment_method' => ['value' => $this->payment_method->value, 'label' => $this->payment_method->label()],
            'payment_status' => ['value' => $this->payment_status->value, 'label' => $this->payment_status->label()],
            'recipient_name' => $this->recipient_name,
            'phone' => $this->phone,
            'address' => $this->address,
            'note' => $this->note,
            'subtotal' => $this->subtotal,
            'shipping_fee' => $this->shipping_fee,
            'total' => $this->total,
            'item_count' => $this->whenLoaded('items', fn () => (int) $this->items->sum('quantity')),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'qr_url' => $needsQr ? VietQr::url($this->resource) : null,
            'bank' => $needsQr ? VietQr::bankInfo() : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
