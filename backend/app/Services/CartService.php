<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class CartService
{
    /**
     * Các dòng trong giỏ, kèm sản phẩm (ảnh đại diện + thương hiệu) để hiển thị.
     *
     * @return Collection<int, CartItem>
     */
    public function items(User $user): Collection
    {
        return $user->cartItems()
            ->with(['product' => fn ($q) => $q->with(['brand', 'category.parent', 'images' => fn ($i) => $i->limit(1)])])
            ->orderBy('id')
            ->get();
    }

    /**
     * Toàn bộ giỏ + tiền. Chỉ dòng mua được mới tính vào tạm tính; giỏ không có gì mua được thì không tính ship.
     *
     * @return array{items: Collection<int, CartItem>, count: int, subtotal: int, shipping_fee: int, total: int, has_unavailable: bool}
     */
    public function summary(User $user): array
    {
        $items = $this->items($user);
        $available = $items->filter(fn (CartItem $item) => $item->unavailableReason() === null);

        $subtotal = (int) $available->sum('line_total');
        $shippingFee = $available->isEmpty() ? 0 : (int) config('shop.shipping_fee');

        return [
            'items' => $items,
            'count' => (int) $items->sum('quantity'),
            'subtotal' => $subtotal,
            'shipping_fee' => $shippingFee,
            'total' => $subtotal + $shippingFee,
            'has_unavailable' => $available->count() !== $items->count(),
        ];
    }

    /**
     * Thêm vào giỏ; sản phẩm đã có thì cộng dồn số lượng.
     *
     * @throws ValidationException tổng số lượng vượt tồn kho
     */
    public function add(User $user, Product $product, int $quantity): CartItem
    {
        $item = $user->cartItems()->firstOrNew(['product_id' => $product->id]);
        $existing = $item->exists ? $item->quantity : 0;

        $this->ensureInStock($product, $existing + $quantity, $existing);

        $item->quantity = $existing + $quantity;
        $item->save();

        return $item;
    }

    /**
     * Đặt lại số lượng một dòng.
     *
     * @throws ValidationException số lượng vượt tồn kho
     */
    public function updateQuantity(CartItem $item, int $quantity): CartItem
    {
        $this->ensureInStock($item->product, $quantity);

        $item->update(['quantity' => $quantity]);

        return $item;
    }

    private function ensureInStock(Product $product, int $wanted, int $alreadyInCart = 0): void
    {
        if ($wanted <= $product->stock) {
            return;
        }

        $message = match (true) {
            $product->stock === 0 => 'Sản phẩm đã hết hàng.',
            $alreadyInCart > 0 => "Chỉ còn {$product->stock} sản phẩm trong kho (giỏ của bạn đã có {$alreadyInCart}).",
            default => "Chỉ còn {$product->stock} sản phẩm trong kho.",
        };

        throw ValidationException::withMessages(['quantity' => $message]);
    }
}
