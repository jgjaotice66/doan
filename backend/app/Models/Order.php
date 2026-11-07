<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'code', 'user_id', 'recipient_name', 'phone', 'address', 'note',
    'subtotal', 'shipping_fee', 'total', 'payment_method', 'payment_status', 'status',
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
        ];
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
