<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ReturnStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

#[Fillable([
    'code', 'user_id', 'recipient_name', 'phone', 'address', 'note',
    'subtotal', 'shipping_fee', 'total', 'payment_method', 'payment_status', 'status', 'completed_at',
])]
class Order extends Model
{
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'integer',
            'shipping_fee' => 'integer',
            'total' => 'integer',
            'payment_method' => PaymentMethod::class,
            'payment_status' => PaymentStatus::class,
            'status' => OrderStatus::class,
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Đơn được tính doanh thu: đã hoàn thành VÀ đã thu tiền.
     * Đơn hoàn tiền (refunded) hay hoàn thành mà chưa thu tiền đều không tính.
     */
    #[Scope]
    protected function countedAsRevenue(Builder $query): Builder
    {
        return $query->where('orders.status', OrderStatus::Completed)->where('orders.payment_status', PaymentStatus::Paid);
    }

    /**
     * Đơn chuyển khoản còn chờ tiền: chưa trả và chưa huỷ.
     * Khách thấy mã QR, admin thấy nút "Đã nhận tiền" — cùng một điều kiện.
     */
    public function awaitsTransfer(): bool
    {
        return $this->payment_method === PaymentMethod::BankQr
            && $this->payment_status === PaymentStatus::Unpaid
            && $this->status !== OrderStatus::Cancelled;
    }

    /**
     * Cùng điều kiện với awaitsTransfer(), dạng truy vấn (bộ lọc "Chờ xác nhận tiền" của admin).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function awaitingTransfer(Builder $query): void
    {
        $query->where('payment_method', PaymentMethod::BankQr)
            ->where('payment_status', PaymentStatus::Unpaid)
            ->where('status', '!=', OrderStatus::Cancelled);
    }

    /**
     * Đơn đã huỷ nhưng tiền khách trả vẫn nằm ở cửa hàng → cần chuyển trả lại.
     */
    public function needsRefund(): bool
    {
        return $this->status === OrderStatus::Cancelled && $this->payment_status === PaymentStatus::Paid;
    }

    /**
     * Cùng điều kiện với needsRefund(), dạng truy vấn (bộ lọc "Cần hoàn tiền" của admin).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function needingRefund(Builder $query): void
    {
        $query->where('status', OrderStatus::Cancelled)->where('payment_status', PaymentStatus::Paid);
    }

    /**
     * Hạn cuối gửi yêu cầu trả hàng = ngày hoàn thành + shop.return_days. Đơn chưa hoàn thành → null.
     */
    public function returnDeadline(): ?Carbon
    {
        if ($this->status !== OrderStatus::Completed || ! $this->completed_at) {
            return null;
        }

        return $this->completed_at->copy()->addDays((int) config('shop.return_days'));
    }

    public function withinReturnWindow(): bool
    {
        return (bool) $this->returnDeadline()?->isFuture();
    }

    /**
     * Số lượng đã/đang trả của từng dòng hàng (yêu cầu bị từ chối không tính): [order_item_id => SL].
     * Dùng quan hệ returnRequests.items nếu đã tải sẵn, không thì truy vấn.
     *
     * @return array<int, int>
     */
    public function returnedQuantities(): array
    {
        $items = $this->relationLoaded('returnRequests')
            ? $this->returnRequests->filter(fn (ReturnRequest $r) => $r->status !== ReturnStatus::Rejected)->flatMap->items
            : ReturnRequestItem::whereHas('returnRequest', fn ($q) => $q->where('order_id', $this->id)->notRejected())->get();

        return $items->groupBy('order_item_id')->map(fn ($group) => (int) $group->sum('quantity'))->all();
    }

    /**
     * Khách gửi được yêu cầu mới: đơn hoàn thành, còn hạn, không có yêu cầu đang mở, còn món chưa trả hết.
     * Cần đã tải items + returnRequests.items.
     */
    public function canRequestReturn(): bool
    {
        if (! $this->withinReturnWindow() || $this->returnRequests->contains(fn (ReturnRequest $r) => $r->status->isOpen())) {
            return false;
        }

        $returned = $this->returnedQuantities();

        return $this->items->contains(fn (OrderItem $item) => $item->quantity > ($returned[$item->id] ?? 0));
    }

    /**
     * Tổng đã hoàn qua các yêu cầu trả hàng (trừ yêu cầu $except) — để chặn hoàn vượt giá trị đơn.
     */
    public function refundedByReturns(?int $except = null): int
    {
        return (int) $this->returnRequests()
            ->where('status', ReturnStatus::Refunded)
            ->when($except, fn ($q) => $q->whereKeyNot($except))
            ->sum('refund_amount');
    }

    /**
     * @return HasMany<ReturnRequest, $this>
     */
    public function returnRequests(): HasMany
    {
        return $this->hasMany(ReturnRequest::class)->latest()->orderByDesc('id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
