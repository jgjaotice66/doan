<?php

namespace App\Support;

/**
 * Mô tả sản phẩm dạng HTML — cùng trình soạn thảo và cùng bộ lọc an toàn với bài viết (PostContent),
 * chỉ khác thư mục chứa ảnh chèn trong nội dung.
 */
class ProductContent extends PostContent
{
    public const IMAGE_DIR = 'products/content';

    /**
     * Chuẩn hoá mô tả trước khi lưu:
     * chữ thường (không có thẻ HTML, VD dữ liệu cũ hoặc gọi API trực tiếp) → các đoạn <p>;
     * HTML → lọc qua danh sách trắng; rỗng sau khi lọc ("<p><br></p>") → null.
     */
    public static function normalize(?string $description): ?string
    {
        if ($description === null || trim($description) === '') {
            return null;
        }

        $isHtml = preg_match('/<[a-z!\/]/i', $description) === 1;
        $html = self::clean($isHtml ? $description : self::fromPlainText($description));

        return self::isBlank($html) ? null : $html;
    }

    /**
     * "Dòng 1\nDòng 2\n\nĐoạn 2" → "<p>Dòng 1<br>Dòng 2</p><p>Đoạn 2</p>" (đã escape ký tự đặc biệt).
     */
    public static function fromPlainText(string $text): string
    {
        $paragraphs = preg_split('/\R\s*\R/u', trim(str_replace("\r\n", "\n", $text)));

        return collect($paragraphs)
            ->map(fn (string $paragraph) => trim($paragraph))
            ->filter()
            ->map(fn (string $paragraph) => '<p>'.preg_replace('/\R/u', '<br>', e($paragraph)).'</p>')
            ->implode('');
    }
}
