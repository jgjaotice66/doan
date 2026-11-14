<?php

use App\Support\ProductContent;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Mô tả sản phẩm chuyển từ chữ thường sang HTML (trình soạn thảo có ảnh).
 * Chỉ đổi dữ liệu: mô tả cũ dạng chữ → các đoạn <p>, giữ nguyên nội dung. Cột vẫn là TEXT.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')
            ->whereNotNull('description')
            ->select(['id', 'description'])
            ->orderBy('id')
            ->each(function (object $product) {
                DB::table('products')->where('id', $product->id)->update([
                    'description' => ProductContent::normalize($product->description),
                ]);
            });
    }

    /**
     * Quay lại chữ thường: bỏ thẻ, mỗi đoạn cách nhau một dòng trống.
     */
    public function down(): void
    {
        DB::table('products')
            ->whereNotNull('description')
            ->select(['id', 'description'])
            ->orderBy('id')
            ->each(function (object $product) {
                $text = preg_replace(['#<br\s*/?>#i', '#</(p|h[2-4]|li|blockquote)>#i'], ["\n", "\n\n"], $product->description);
                DB::table('products')->where('id', $product->id)->update([
                    'description' => trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8')),
                ]);
            });
    }
};
