<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cod = 'cod';
    case BankQr = 'bank_qr';

    public function label(): string
    {
        return match ($this) {
            self::Cod => 'Thanh toán khi nhận hàng',
            self::BankQr => 'Chuyển khoản QR',
        };
    }
}
