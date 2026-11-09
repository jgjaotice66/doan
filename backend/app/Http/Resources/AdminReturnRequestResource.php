<?php

namespace App\Http\Resources;

use App\Enums\ReturnStatus;
use App\Models\ReturnRequest;
use App\Services\ReturnService;
use Illuminate\Http\Request;

/**
 * Yêu cầu trả hàng phía admin = dữ liệu khách thấy + đơn gốc, khách, mức hoàn tối đa, các thao tác được phép.
 *
 * @mixin ReturnRequest
 */
class AdminReturnRequestResource extends ReturnRequestResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'max_refund' => $this->when($this->relationLoaded('order'), fn () => app(ReturnService::class)->maxRefund($this->resource)),
            'item_count' => $this->whenLoaded('items', fn () => (int) $this->items->sum('quantity')),
            'order' => $this->whenLoaded('order', fn () => [
                'id' => $this->order->id,
                'code' => $this->order->code,
                'total' => $this->order->total,
                'payment_method' => ['value' => $this->order->payment_method->value, 'label' => $this->order->payment_method->label()],
                'completed_at' => $this->order->completed_at,
            ]),
            'customer' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
            ]),
            // Nút trên trang chi tiết = đúng các bước server cho phép (approve | receive | refund | reject).
            'allowed_actions' => array_map(fn (ReturnStatus $status) => $status->action(), $this->status->allowedNext()),
        ];
    }
}
