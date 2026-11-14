<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Câu khách gõ vào chatbot, đã chuẩn hoá (bỏ dấu, chữ thường) để so khớp từ khoá.
 *
 * Mỗi lần "lấy" một thông tin (giá, tuổi, danh mục…) thì đoạn chữ đó bị cắt khỏi câu,
 * phần còn lại (keywords()) dùng để tìm theo tên sản phẩm.
 */
class ChatMessage
{
    /** Số tiền: 500k, 1tr5, 1.5 triệu, 800.000đ, 2 củ… */
    private const AMOUNT = '(\d+(?:[.,]\d+)*)\s*(k|nghin|ngan|tr|trieu|cu|d|dong|vnd)?(\d{1,2})?\b';

    /** Từ đệm, từ chung chung — không dùng để tìm theo tên. */
    private const STOPWORDS = [
        'a', 'ah', 'a', 'ak', 'ad', 'shop', 'oi', 'nhe', 'nha', 'nhi', 'ha', 'vay', 'the', 'co', 'khong', 'ko', 'k', 'kh', 'hong',
        'nao', 'gi', 'cho', 'minh', 'toi', 'tui', 'em', 'anh', 'chi', 'ban', 'mua', 'muon', 'can', 'tim', 'kiem', 'xem',
        'hoi', 'gia', 're', 'dat', 'mac', 'san', 'pham', 'sp', 'hang', 'loai', 'mau', 'mot', 'may', 'vai', 'nhung', 'cac',
        'nay', 'kia', 'do', 'duoc', 've', 'cua', 'be', 'trai', 'gai', 'qua', 'tang', 'nguoi', 'lon', 'tre', 'con', 'mon',
        'cai', 'choi', 'voi', 'va', 'hay', 'la', 'thi', 'ma', 'nhat', 'hon', 'moi', 'chay', 'noi', 'bat', 'goi', 'y',
        'xin', 'chao', 'hello', 'hi', 'hey', 'alo', 'nhieu', 'bao', 'tien', 'it', 'rat', 'kha', 'lam', 'dep', 'vui', 'long',
        'giup', 'dum', 'ho', 'voi', 'nua', 'khac', 'them', 'dang', 'con', 'ai', 'biet', 'thu', 'tham', 'khao', 'dc', 'duoc',
        'ah', 'uh', 'um', 'oke', 'ok', 'pho', 'bien', 'cao', 'cap', 'xin', 'sao', 'nhu', 'ntn',
        // Dịp tặng quà, người nhận — không phải tên sản phẩm.
        'sinh', 'noel', 'giang', 'sinh', 'tet', 'dip', 'le', 'ky', 'niem', 'yeu', 'vo', 'chong', 'chau', 'ny', 'ngay', 'nam', 'nu',
    ];

    public readonly string $text;

    private string $rest;

    public function __construct(string $raw)
    {
        $text = Str::lower(Str::ascii($raw, 'vi'));
        // Giữ chữ, số và dấu ngăn cách số (800.000, 1,5); còn lại thành khoảng trắng.
        $text = preg_replace('/[^a-z0-9.,]+/', ' ', $text);
        $text = preg_replace('/(?<!\d)[.,]|[.,](?!\d)/', ' ', $text);
        $this->text = trim(preg_replace('/\s+/', ' ', $text));
        $this->rest = " {$this->text} ";
    }

    /**
     * Câu có chứa một trong các cụm từ (khớp nguyên từ)?
     *
     * @param  list<string>  $phrases  đã bỏ dấu, chữ thường
     */
    public function has(array $phrases): bool
    {
        foreach ($phrases as $phrase) {
            if (preg_match('/\b'.preg_quote($phrase, '/').'\b/', $this->text)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Mã đơn hàng (TS + 6 số + 4 ký tự) nếu khách gõ kèm.
     */
    public function orderCode(): ?string
    {
        return $this->take('/\bts\d{6}[a-z0-9]{4}\b/') ? Str::upper($this->lastMatch[0]) : null;
    }

    /**
     * "bé 6 tuổi" → 6.
     */
    public function age(): ?int
    {
        return $this->take('/\b(\d{1,2})\s*tuoi\b/') ? (int) $this->lastMatch[1] : null;
    }

    /**
     * Khoảng giá khách nói tới.
     *
     * @return array{min: ?int, max: ?int}
     */
    public function priceRange(): array
    {
        $amount = self::AMOUNT;

        // "từ 1 đến 2 triệu": số đầu không có đơn vị thì mượn đơn vị của số sau.
        if ($this->take("/\\b(?:tu|khoang|tam)?\\s*{$amount}\\s*(?:den|toi)\\s*{$amount}/")) {
            [, $num1, $unit1, $tail1, $num2, $unit2, $tail2] = $this->lastMatch + array_fill(0, 7, '');

            return [
                'min' => self::toVnd($num1, $unit1 ?: $unit2, $tail1),
                'max' => self::toVnd($num2, $unit2, $tail2),
            ];
        }

        if ($this->take("/\\b(?:khoang|tam|tam tam|chung)\\s*{$amount}/")) {
            $value = self::toVnd(...$this->amountParts(1));

            return ['min' => (int) round($value * 0.8), 'max' => (int) round($value * 1.2)];
        }

        if ($this->take("/\\b(?:duoi|nho hon|it hon|khong qua|toi da|re hon|max)\\s*{$amount}/")) {
            return ['min' => null, 'max' => self::toVnd(...$this->amountParts(1))];
        }

        if ($this->take("/\\b(?:tren|lon hon|nhieu hon|it nhat|tu)\\s*{$amount}(?:\\s*tro len)?/")
            || $this->take("/\\b{$amount}\\s*tro len\\b/")) {
            return ['min' => self::toVnd(...$this->amountParts(1)), 'max' => null];
        }

        // Số có đơn vị tiền mà không kèm "dưới/trên" (VD "gundam 500k") → coi là ngân sách tối đa.
        if ($this->take('/\\b(\\d+(?:[.,]\\d+)*)\\s*(k|nghin|ngan|tr|trieu|cu|d|dong|vnd)(\\d{1,2})?\\b/')) {
            return ['min' => null, 'max' => self::toVnd(...$this->amountParts(1))];
        }

        return ['min' => null, 'max' => null];
    }

    /**
     * Tìm cụm từ dài nhất khớp trong câu và cắt nó ra.
     *
     * @param  array<string, string>  $aliases  cụm từ (bỏ dấu) => giá trị trả về
     */
    public function takeAlias(array $aliases): ?string
    {
        uksort($aliases, fn (string $a, string $b) => strlen($b) <=> strlen($a));

        foreach ($aliases as $phrase => $value) {
            if ($phrase !== '' && $this->take('/\b'.preg_quote($phrase, '/').'\b/')) {
                return $value;
            }
        }

        return null;
    }

    /**
     * Từ còn lại sau khi đã lấy hết thông tin và bỏ từ đệm — dùng để tìm theo tên sản phẩm.
     *
     * @param  list<string>  $ignore  thêm từ cần bỏ (VD từ khoá ý định)
     */
    public function keywords(array $ignore = []): string
    {
        $skip = array_flip([...self::STOPWORDS, ...$ignore]);
        $words = array_filter(
            preg_split('/[\s.,]+/', $this->rest, -1, PREG_SPLIT_NO_EMPTY),
            fn (string $word) => ! isset($skip[$word]) && (strlen($word) >= 2 || ctype_digit($word)),
        );

        return implode(' ', array_slice(array_values($words), 0, 6));
    }

    /** @var array<int, string> */
    private array $lastMatch = [];

    /**
     * Khớp regex trên phần câu chưa dùng; khớp thì cắt đoạn đó ra.
     */
    private function take(string $pattern): bool
    {
        if (! preg_match($pattern, $this->rest, $match)) {
            return false;
        }

        $this->lastMatch = $match;
        $this->rest = str_replace($match[0], ' ', $this->rest);

        return true;
    }

    /**
     * @return array{string, string, string}
     */
    private function amountParts(int $offset): array
    {
        return [
            $this->lastMatch[$offset] ?? '',
            $this->lastMatch[$offset + 1] ?? '',
            $this->lastMatch[$offset + 2] ?? '',
        ];
    }

    /**
     * Đổi số + đơn vị ra đồng. Không đơn vị mà nhỏ hơn 1000 (VD "dưới 500") → hiểu là nghìn.
     */
    private static function toVnd(string $number, string $unit, string $tail): int
    {
        $millions = in_array($unit, ['tr', 'trieu', 'cu'], true);
        $thousands = in_array($unit, ['k', 'nghin', 'ngan'], true);

        if ($millions || $thousands) {
            $value = (float) str_replace(',', '.', $number);
            if ($millions && $tail !== '') {
                $value += (float) ('0.'.$tail);
            }

            return (int) round($value * ($millions ? 1_000_000 : 1_000));
        }

        $value = (int) str_replace(['.', ','], '', $number);

        return $value < 1000 ? $value * 1000 : $value;
    }
}
