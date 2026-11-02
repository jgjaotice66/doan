<?php

namespace App\Enums;

enum ProductStatus: string
{
    case Active = 'active';
    case Hidden = 'hidden';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Đang bán',
            self::Hidden => 'Ẩn',
        };
    }
}
