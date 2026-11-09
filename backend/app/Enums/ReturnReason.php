<?php

namespace App\Enums;

enum ReturnReason: string
{
    case Defective = 'defective';
    case WrongItem = 'wrong_item';
    case MissingParts = 'missing_parts';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Defective => 'Lỗi / hỏng',
            self::WrongItem => 'Giao sai sản phẩm',
            self::MissingParts => 'Thiếu phụ kiện',
            self::Other => 'Lý do khác',
        };
    }
}
