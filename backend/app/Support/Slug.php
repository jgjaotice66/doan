<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Slug
{
    /**
     * Slug không trùng trong bảng của model: "Mô hình Gundam" → mo-hinh-gundam, đã có thì mo-hinh-gundam-2, -3…
     *
     * @param  class-string<Model>  $model
     * @param  int|null  $ignoreId  bản ghi đang sửa (giữ được slug của chính nó)
     */
    public static function unique(string $model, string $source, ?int $ignoreId = null, string $column = 'slug'): string
    {
        $base = Str::slug($source) ?: 'item';
        $slug = $base;
        $suffix = 2;

        $query = fn (string $candidate) => $model::query()
            // Sản phẩm đã xoá mềm vẫn giữ slug trong DB (cột unique) → phải tính cả.
            ->when(in_array(SoftDeletes::class, class_uses_recursive($model)), fn ($q) => $q->withTrashed())
            ->where($column, $candidate)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        while ($query($slug)) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
