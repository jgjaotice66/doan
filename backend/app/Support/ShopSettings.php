<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Cài đặt cửa hàng admin sửa được. Thứ tự ưu tiên: bảng settings → config/shop.php (.env).
 * Toàn bộ bảng được cache; lưu xong thì xoá cache → lần đọc sau (VD: QR của đơn) thấy giá trị mới ngay.
 */
class ShopSettings
{
    private const CACHE_KEY = 'shop_settings';

    /** Các khoá thông tin chuyển khoản ↔ khoá config mặc định. */
    private const BANK_KEYS = [
        'bank' => 'vietqr.bank',
        'account' => 'vietqr.account',
        'account_name' => 'vietqr.account_name',
    ];

    public static function get(string $key): ?string
    {
        $saved = Cache::rememberForever(self::CACHE_KEY, fn () => Setting::pluck('value', 'key')->all());

        return $saved[$key] ?? config("shop.{$key}");
    }

    /**
     * @return array{bank: string, account: string, account_name: string}
     */
    public static function bankAccount(): array
    {
        return array_map(fn (string $key) => (string) self::get($key), self::BANK_KEYS);
    }

    /**
     * @param  array{bank: string, account: string, account_name: string}  $data
     */
    public static function updateBankAccount(array $data): void
    {
        DB::transaction(function () use ($data) {
            foreach (self::BANK_KEYS as $field => $key) {
                Setting::updateOrCreate(['key' => $key], ['value' => $data[$field]]);
            }
        });

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Ngưỡng "sắp hết hàng" chung (khi sản phẩm và danh mục không đặt riêng).
     */
    public static function lowStockThreshold(): int
    {
        return (int) self::get('low_stock_threshold');
    }

    public static function updateLowStockThreshold(int $threshold): void
    {
        Setting::updateOrCreate(['key' => 'low_stock_threshold'], ['value' => (string) $threshold]);

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Danh sách ngân hàng (config shop.banks) dạng [{ code, name }] — cho ô chọn ngân hàng.
     *
     * @return list<array{code: string, name: string}>
     */
    public static function banks(): array
    {
        return collect(config('shop.banks'))
            ->map(fn (string $name, string $code) => ['code' => $code, 'name' => $name])
            ->values()
            ->all();
    }
}
