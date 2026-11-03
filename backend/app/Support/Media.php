<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Media
{
    /**
     * Đổi đường dẫn ảnh đã lưu thành URL đầy đủ.
     * Link ngoài (http/https) giữ nguyên; file trong disk public dùng Storage::url.
     */
    public static function url(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
