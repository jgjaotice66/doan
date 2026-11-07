<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Http\Request;

/**
 * Đơn hàng phía admin = dữ liệu khách thấy + tài khoản đặt hàng + các thao tác được phép.
 *
 * @mixin Order
 */
class AdminOrderResource extends OrderResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            // Danh sách không tải từng dòng hàng, chỉ tổng số lượng (withSum).
            'item_count' => $this->relationLoaded('items')
                ? (int) $this->items->sum('quantity')
                : (int) ($this->items_sum_quantity ?? 0),
            'customer' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            // Nút chuyển trạng thái trên trang chi tiết = đúng các bước server cho phép.
            'allowed_next' => array_map(
                fn (OrderStatus $status) => ['value' => $status->value, 'label' => $status->label()],
                $this->status->allowedNext(),
            ),
            'can_mark_paid' => $this->awaitsTransfer(),
        ];
    }
}
