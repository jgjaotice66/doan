<?php

namespace App\Support;

use HTMLPurifier;
use HTMLPurifier_Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Nội dung HTML của bài viết (soạn bằng Quill bên admin).
 *
 * clean(): lọc HTML bằng HTMLPurifier theo danh sách trắng — chỉ giữ thẻ soạn thảo
 * (tiêu đề, đoạn, đậm/nghiêng, danh sách, trích dẫn, link, ảnh); bỏ <script>, onclick=…,
 * javascript:…, iframe, ảnh base64. Storefront hiển thị bằng dangerouslySetInnerHTML nên
 * mọi HTML phải đi qua đây trước khi lưu.
 */
class PostContent
{
    /** Thư mục ảnh chèn trong nội dung (disk public). */
    public const IMAGE_DIR = 'posts/content';

    private const ALLOWED = 'h2,h3,h4,p[class],br,strong,b,em,i,u,s,blockquote[class],ul,ol,li[class],'
        .'a[href|target|rel],img[src|alt|width|height],hr,pre,code';

    /** Class Quill dùng để căn lề/thụt dòng — giữ lại, class khác bỏ. */
    private const ALLOWED_CLASSES = [
        'ql-align-center', 'ql-align-right', 'ql-align-justify',
        'ql-indent-1', 'ql-indent-2', 'ql-indent-3',
    ];

    private static ?HTMLPurifier $purifier = null;

    /**
     * Quill 2 (getSemanticHTML) ghi mọi dấu cách thành &nbsp; → cả đoạn thành một "từ" dài,
     * trình duyệt chỉ ngắt dòng ở dấu gạch hoặc giữa chữ. Đổi về dấu cách thường sau khi lọc.
     */
    public static function clean(?string $html): string
    {
        $clean = self::purifier()->purify((string) $html);

        return trim(str_replace(["\u{00A0}", '&nbsp;', '&#160;'], ' ', $clean));
    }

    /**
     * Còn chữ hoặc ảnh sau khi lọc? (Quill để trống vẫn gửi "<p><br></p>").
     */
    public static function isBlank(string $html): bool
    {
        return self::plainText($html) === '' && ! str_contains($html, '<img');
    }

    /**
     * Chữ thuần, các khối cách nhau một dấu cách — dùng làm tóm tắt tự động.
     */
    public static function plainText(string $html): string
    {
        $text = html_entity_decode(strip_tags(str_replace('<', ' <', $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $text));
    }

    public static function excerpt(string $html, int $limit = 200): string
    {
        return Str::limit(self::plainText($html), $limit);
    }

    /**
     * Đường dẫn (trong disk public) các ảnh do admin tải lên mà nội dung đang dùng.
     *
     * @return list<string>
     */
    public static function imagePaths(?string $html): array
    {
        preg_match_all('#/storage/('.preg_quote(static::IMAGE_DIR, '#').'/[A-Za-z0-9._-]+)#', (string) $html, $matches);

        return array_values(array_unique($matches[1]));
    }

    /**
     * Xoá ảnh nội dung không còn dùng (có trong $before nhưng không có trong $after).
     */
    public static function deleteUnusedImages(?string $before, ?string $after = null): void
    {
        $unused = array_diff(self::imagePaths($before), self::imagePaths($after));

        if ($unused !== []) {
            Storage::disk('public')->delete(array_values($unused));
        }
    }

    private static function purifier(): HTMLPurifier
    {
        if (self::$purifier) {
            return self::$purifier;
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Core.Encoding', 'UTF-8');
        $config->set('HTML.Doctype', 'HTML 4.01 Transitional');
        $config->set('HTML.Allowed', self::ALLOWED);
        $config->set('Attr.AllowedClasses', self::ALLOWED_CLASSES);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);
        // Link mở tab mới tự thêm rel="noreferrer noopener" (chống tabnabbing).
        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.TargetNoreferrer', true);
        $config->set('HTML.TargetNoopener', true);
        // Không có "data" → ảnh base64 bị bỏ (ảnh phải tải lên qua API).
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true, 'tel' => true]);
        $config->set('AutoFormat.RemoveEmpty', true);
        // Lọc chỉ chạy khi admin lưu bài → không cần cache định nghĩa ra đĩa.
        $config->set('Cache.DefinitionImpl', null);

        return self::$purifier = new HTMLPurifier($config);
    }
}
