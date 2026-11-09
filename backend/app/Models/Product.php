<?php

namespace App\Models;

use App\Enums\ProductStatus;
use App\Support\ShopSettings;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

#[Fillable([
    'category_id', 'brand_id', 'name', 'slug', 'sku', 'description',
    'price', 'sale_price', 'stock', 'low_stock_threshold', 'min_age', 'is_featured', 'status',
])]
class Product extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Các mốc độ tuổi hợp lệ cho cột min_age.
     */
    public const AGE_GROUPS = [0, 3, 6, 8, 14, 18];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'sale_price' => 'integer',
            'stock' => 'integer',
            'low_stock_threshold' => 'integer',
            'min_age' => 'integer',
            'is_featured' => 'boolean',
            'status' => ProductStatus::class,
        ];
    }

    /**
     * Rule validate: product_id phải là sản phẩm đang bán (không ẩn, không bị xoá).
     */
    public static function activeExistsRule(): Exists
    {
        return Rule::exists('products', 'id')
            ->where('status', ProductStatus::Active->value)
            ->whereNull('deleted_at');
    }

    /**
     * Giá khách thực trả: giá khuyến mãi nếu có, ngược lại là giá gốc.
     */
    protected function finalPrice(): Attribute
    {
        return Attribute::get(fn (): int => $this->sale_price ?? $this->price);
    }

    /**
     * Ngưỡng "sắp hết hàng" thực tế: riêng sản phẩm → danh mục → danh mục cha → ngưỡng chung.
     * Nên tải sẵn category.parent khi gọi cho cả danh sách (tránh truy vấn lặp).
     *
     * @return array{value: int, source: 'product'|'category'|'global', label: string}
     */
    public function lowStockThreshold(): array
    {
        if ($this->low_stock_threshold !== null) {
            return ['value' => $this->low_stock_threshold, 'source' => 'product', 'label' => 'Riêng sản phẩm này'];
        }

        foreach ([$this->category, $this->category?->parent] as $category) {
            if ($category?->low_stock_threshold !== null) {
                return ['value' => $category->low_stock_threshold, 'source' => 'category', 'label' => "Theo danh mục {$category->name}"];
            }
        }

        return ['value' => ShopSettings::lowStockThreshold(), 'source' => 'global', 'label' => 'Ngưỡng chung'];
    }

    public function isLowStock(): bool
    {
        return $this->stock <= $this->lowStockThreshold()['value'];
    }

    /**
     * Cùng quy tắc với lowStockThreshold(), dạng SQL — để lọc / đếm "sắp hết" ngay trong DB.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function lowStock(Builder $query): void
    {
        $query->whereRaw('products.stock <= COALESCE(
            products.low_stock_threshold,
            (SELECT c.low_stock_threshold FROM categories c WHERE c.id = products.category_id),
            (SELECT p.low_stock_threshold FROM categories c JOIN categories p ON p.id = c.parent_id WHERE c.id = products.category_id),
            ?
        )', [ShopSettings::lowStockThreshold()]);
    }

    /**
     * Chỉ lấy sản phẩm đang bán.
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('status', ProductStatus::Active);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<StockMovement, $this>
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
