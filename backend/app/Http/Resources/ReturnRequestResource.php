<?php

namespace App\Http\Resources;

use App\Models\ReturnRequest;
use App\Models\ReturnRequestItem;
use App\Models\ReturnRequestMedia;
use App\Services\ReturnService;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Yêu cầu trả hàng (khách xem trong chi tiết đơn). Cần tải items.orderItem(.product.images), media, order.
 *
 * @mixin ReturnRequest
 */
class ReturnRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $service = app(ReturnService::class);
        $hasMoney = $this->relationLoaded('order') && $this->relationLoaded('items');

        return [
            'id' => $this->id,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'reason' => ['value' => $this->reason->value, 'label' => $this->reason->label()],
            'description' => $this->description,
            'bank_name' => $this->bank_name,
            'bank_account' => $this->bank_account,
            'account_name' => $this->account_name,
            'refund_amount' => $this->refund_amount,
            'suggested_refund' => $this->when($hasMoney, fn () => $service->suggestedRefund($this->resource)),
            'admin_note' => $this->admin_note,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (ReturnRequestItem $item) => [
                'id' => $item->id,
                'order_item_id' => $item->order_item_id,
                'product_name' => $item->orderItem->product_name,
                'price' => $item->orderItem->price,
                'quantity' => $item->quantity,
                'line_total' => $item->orderItem->price * $item->quantity,
                'restock' => $item->restock,
                'thumbnail' => $item->orderItem->relationLoaded('product')
                    ? Media::url($item->orderItem->product?->images->first()?->path)
                    : null,
            ])),
            'media' => $this->whenLoaded('media', fn () => $this->media->map(fn (ReturnRequestMedia $media) => [
                'id' => $media->id,
                'type' => $media->type,
                'url' => Media::url($media->path),
            ])),
            'created_at' => $this->created_at,
            'reviewed_at' => $this->reviewed_at,
            'received_at' => $this->received_at,
            'refunded_at' => $this->refunded_at,
        ];
    }
}
