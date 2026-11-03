<?php

namespace App\Services;

use App\Enums\StockReason;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use LogicException;

/**
 * Mọi thay đổi tồn kho đều đi qua đây: vừa cập nhật products.stock,
 * vừa ghi stock_movements để lịch sử kho luôn khớp với số tồn.
 * Gọi bên trong DB::transaction và sau khi đã lockForUpdate sản phẩm.
 */
class StockService
{
    /**
     * @param  int  $change  số dương = nhập/hoàn kho, số âm = xuất kho
     */
    public function record(Product $product, int $change, StockReason $reason, ?Order $order = null, ?User $user = null, ?string $note = null): StockMovement
    {
        if ($product->stock + $change < 0) {
            throw new LogicException("Tồn kho của sản phẩm #{$product->id} không thể âm.");
        }

        $product->stock += $change;
        $product->save();

        return $product->stockMovements()->create([
            'change' => $change,
            'reason' => $reason,
            'order_id' => $order?->id,
            'user_id' => $user?->id,
            'note' => $note,
        ]);
    }

    /**
     * Trừ kho khi bán.
     */
    public function decrease(Product $product, int $quantity, StockReason $reason, ?Order $order = null, ?User $user = null): StockMovement
    {
        return $this->record($product, -$quantity, $reason, $order, $user);
    }
}
