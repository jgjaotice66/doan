<?php

namespace App\Models;

use App\Enums\ProductStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'category_id', 'brand_id', 'name', 'slug', 'sku', 'description',
    'price', 'sale_price', 'stock', 'min_age', 'is_featured', 'status',
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
            'min_age' => 'integer',
            'is_featured' => 'boolean',
            'status' => ProductStatus::class,
        ];
    }

    /**
     * Giá khách thực trả: giá khuyến mãi nếu có, ngược lại là giá gốc.
     */
    protected function finalPrice(): Attribute
    {
        return Attribute::get(fn (): int => $this->sale_price ?? $this->price);
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
