<?php

namespace App\Queries;

use App\Enums\OrderStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

/**
 * Áp các bộ lọc và cách sắp xếp của trang danh sách sản phẩm lên query.
 */
class ProductFilter
{
    /**
     * Giá khách thực trả, tính ngay trong SQL.
     */
    private const FINAL_PRICE = 'COALESCE(products.sale_price, products.price)';

    /**
     * @param  Builder<Product>  $query
     * @param  array<string, mixed>  $filters  dữ liệu đã validate từ ProductIndexRequest
     * @return Builder<Product>
     */
    public static function apply(Builder $query, array $filters): Builder
    {
        $query
            // Mỗi từ phải có trong tên hoặc SKU, không cần liền nhau: "nendoroid miku" → "Nendoroid Hatsune Miku".
            ->when($filters['q'] ?? null, function (Builder $q, string $keyword) {
                foreach (preg_split('/\s+/u', trim($keyword), -1, PREG_SPLIT_NO_EMPTY) as $word) {
                    $q->where(fn (Builder $w) => $w
                        ->where('name', 'like', "%{$word}%")
                        ->orWhere('sku', 'like', "%{$word}%"));
                }
            })
            // Danh mục cha bao gồm cả sản phẩm của danh mục con.
            ->when($filters['category'] ?? null, function (Builder $q, string $slug) {
                $q->whereHas('category', fn (Builder $c) => $c
                    ->where('slug', $slug)
                    ->orWhereHas('parent', fn (Builder $p) => $p->where('slug', $slug)));
            })
            ->when($filters['brand'] ?? null, function (Builder $q, array $slugs) {
                $q->whereHas('brand', fn (Builder $b) => $b->whereIn('slug', $slugs));
            })
            ->when(isset($filters['min_age']), fn (Builder $q) => $q->where('min_age', $filters['min_age']))
            ->when(isset($filters['price_min']), fn (Builder $q) => $q->whereRaw(self::FINAL_PRICE.' >= ?', [$filters['price_min']]))
            ->when(isset($filters['price_max']), fn (Builder $q) => $q->whereRaw(self::FINAL_PRICE.' <= ?', [$filters['price_max']]))
            ->when(! empty($filters['featured']), fn (Builder $q) => $q->where('is_featured', true));

        return self::sort($query, $filters['sort'] ?? 'newest');
    }

    /**
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    private static function sort(Builder $query, string $sort): Builder
    {
        match ($sort) {
            'price_asc' => $query->orderByRaw(self::FINAL_PRICE.' asc'),
            'price_desc' => $query->orderByRaw(self::FINAL_PRICE.' desc'),
            // Tổng số lượng đã bán trong các đơn chưa bị huỷ.
            'best_selling' => $query
                ->withSum(['orderItems as sold_quantity' => fn (Builder $q) => $q
                    ->whereHas('order', fn (Builder $o) => $o->where('status', '!=', OrderStatus::Cancelled))], 'quantity')
                ->orderByDesc('sold_quantity'),
            default => $query->latest(),
        };

        // Thứ tự phụ để phân trang ổn định khi giá trị sắp xếp bằng nhau.
        return $query->orderByDesc('products.id');
    }
}
