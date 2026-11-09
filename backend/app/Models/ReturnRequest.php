<?php

namespace App\Models;

use App\Enums\ReturnReason;
use App\Enums\ReturnStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'order_id', 'user_id', 'status', 'reason', 'description', 'bank_name', 'bank_account', 'account_name',
    'refund_amount', 'admin_note', 'reviewed_at', 'received_at', 'refunded_at',
])]
class ReturnRequest extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReturnStatus::class,
            'reason' => ReturnReason::class,
            'refund_amount' => 'integer',
            'reviewed_at' => 'datetime',
            'received_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    /**
     * Yêu cầu còn đang xử lý (chưa hoàn tiền, chưa bị từ chối).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function open(Builder $query): void
    {
        $query->whereIn('status', ReturnStatus::open());
    }

    /**
     * Yêu cầu có tính số lượng đã trả (mọi trạng thái trừ "Từ chối").
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function notRejected(Builder $query): void
    {
        $query->where('status', '!=', ReturnStatus::Rejected);
    }

    /**
     * Số tiền gợi ý hoàn = Σ(giá lúc mua × SL trả), không gồm phí ship. Cần đã tải items.orderItem.
     */
    public function itemsTotal(): int
    {
        return (int) $this->items->sum(fn (ReturnRequestItem $item) => $item->orderItem->price * $item->quantity);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<ReturnRequestItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ReturnRequestItem::class)->orderBy('id');
    }

    /**
     * @return HasMany<ReturnRequestMedia, $this>
     */
    public function media(): HasMany
    {
        return $this->hasMany(ReturnRequestMedia::class)->orderBy('id');
    }
}
