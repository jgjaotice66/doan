<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Paid = 'paid';
    /** Đơn huỷ sau khi đã nhận tiền, admin đã chuyển trả lại khách. */
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Unpaid => 'Chưa thanh toán',
            self::Paid => 'Đã thanh toán',
            self::Refunded => 'Đã hoàn tiền',
        };
    }
}
