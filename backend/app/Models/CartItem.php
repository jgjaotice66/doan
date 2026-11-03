<?php

namespace App\Models;

use App\Enums\ProductStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'product_id', 'quantity'])]
class CartItem extends Model
{
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    /**
     * Lý do không mua được dòng này (null = mua được).
     * Sản phẩm bị ẩn/xoá hoặc hết hàng sau khi khách đã bỏ vào giỏ vẫn hiện trong giỏ kèm lý do.
     */
    public function unavailableReason(): ?string
    {
        $product = $this->product;

        if ($product === null || $product->trashed() || $product->status !== ProductStatus::Active) {
            return 'Sản phẩm đã ngừng kinh doanh';
        }

        if ($product->stock === 0) {
            return 'Hết hàng';
        }

        if ($this->quantity > $product->stock) {
            return "Chỉ còn {$product->stock} sản phẩm";
        }

        return null;
    }

    /**
     * Thành tiền theo giá hiện tại của sản phẩm.
     */
    protected function lineTotal(): Attribute
    {
        return Attribute::get(fn (): int => ($this->product?->final_price ?? 0) * $this->quantity);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Gồm cả sản phẩm đã xoá mềm, để giỏ vẫn hiện được dòng đó kèm cờ "ngừng kinh doanh".
     *
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
