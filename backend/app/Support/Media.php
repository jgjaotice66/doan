<?php

namespace App\Support;

use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

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

    /**
     * Lưu file tải lên vào disk public (tên ngẫu nhiên), trả đường dẫn để ghi vào DB.
     */
    public static function store(UploadedFile $file, string $directory): string
    {
        return $file->store($directory, 'public');
    }

    /**
     * Đổi ảnh của một bản ghi an toàn: lưu file mới → $save($path) ghi DB → xong mới xoá file cũ.
     * Ghi DB lỗi thì xoá file mới vừa lưu và giữ nguyên file cũ (DB vẫn đang trỏ tới nó).
     *
     * $file có → ảnh mới · $remove → gỡ ảnh (null) · không cả hai → giữ $current.
     * Tạo mới: truyền $current = null.
     *
     * @template T
     *
     * @param  Closure(?string): T  $save
     * @return T
     */
    public static function swap(?string $current, ?UploadedFile $file, bool $remove, string $directory, Closure $save): mixed
    {
        $next = $file ? self::store($file, $directory) : ($remove ? null : $current);

        try {
            $result = $save($next);
        } catch (Throwable $e) {
            if ($file) {
                self::delete($next);
            }

            throw $e;
        }

        if ($next !== $current) {
            self::delete($current);
        }

        return $result;
    }

    /**
     * Xoá file trong disk public; link ngoài (ảnh demo) hoặc rỗng thì bỏ qua.
     */
    public static function delete(?string $path): void
    {
        if (blank($path) || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
