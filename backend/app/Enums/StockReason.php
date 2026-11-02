<?php

namespace App\Enums;

enum StockReason: string
{
    case Order = 'order';
    case Cancel = 'cancel';
    case Import = 'import';
    case Adjust = 'adjust';

    public function label(): string
    {
        return match ($this) {
            self::Order => 'Bán hàng',
            self::Cancel => 'Huỷ đơn hoàn kho',
            self::Import => 'Nhập kho',
            self::Adjust => 'Điều chỉnh',
        };
    }
}
