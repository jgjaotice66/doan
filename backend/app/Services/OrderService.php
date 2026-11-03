<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StockReason;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /** Bỏ các ký tự dễ nhầm (0/O, 1/I) khỏi mã đơn khách phải gõ khi chuyển khoản. */
    private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function __construct(private StockService $stock) {}

    /**
     * Tạo đơn từ giỏ hàng. Toàn bộ chạy trong 1 transaction: lỗi ở bất kỳ bước nào
     * thì không tạo đơn, không trừ kho, giỏ giữ nguyên.
     *
     * @param  array{recipient_name: string, phone: string, address: string, note?: ?string, payment_method: string}  $data
     *
     * @throws ValidationException giỏ trống hoặc có sản phẩm không mua được
     */
    public function place(User $user, array $data): Order
    {
        return DB::transaction(function () use ($user, $data) {
            $items = $user->cartItems()->orderBy('product_id')->get();

            if ($items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => 'Giỏ hàng đang trống.']);
            }

            // Khoá các dòng sản phẩm tới hết transaction: 2 người cùng mua món cuối thì chỉ 1 người được.
            // Khoá theo thứ tự id tăng dần để hai đơn đồng thời không khoá chéo nhau (deadlock).
            $products = Product::withTrashed()
                ->whereKey($items->pluck('product_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $this->ensurePurchasable($items, $products);

            $subtotal = $items->sum(fn (CartItem $item) => $item->product->final_price * $item->quantity);
            $shippingFee = (int) config('shop.shipping_fee');

            $order = $user->orders()->create([
                'code' => $this->generateCode(),
                'recipient_name' => $data['recipient_name'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'note' => $data['note'] ?? null,
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'total' => $subtotal + $shippingFee,
                'payment_method' => PaymentMethod::from($data['payment_method']),
                'payment_status' => PaymentStatus::Unpaid,
                'status' => OrderStatus::Pending,
            ]);

            foreach ($items as $item) {
                // Chụp lại tên + giá tại thời điểm đặt: sau này sửa sản phẩm, đơn cũ không đổi.
                $order->items()->create([
                    'product_id' => $item->product->id,
                    'product_name' => $item->product->name,
                    'price' => $item->product->final_price,
                    'quantity' => $item->quantity,
                ]);

                $this->stock->decrease($item->product, $item->quantity, StockReason::Order, $order, $user);
            }

            $user->cartItems()->delete();

            return $order;
        });
    }

    /**
     * Chuyển trạng thái đơn theo OrderStatus::allowedNext(). Dùng chung cho khách (huỷ) và admin (task 30).
     *   - Huỷ → hoàn kho từng dòng (reason = cancel).
     *   - Hoàn thành + COD → tự đánh dấu đã thanh toán (shipper đã thu tiền).
     *
     * @throws ValidationException chuyển sai luồng
     */
    public function changeStatus(Order $order, OrderStatus $to, User $actor): Order
    {
        return DB::transaction(function () use ($order, $to, $actor) {
            // Khoá lại dòng đơn và đọc trạng thái mới nhất: bấm huỷ 2 lần (hoặc khách + admin cùng huỷ)
            // thì lần sau thấy đơn đã huỷ và bị từ chối → kho không bị hoàn 2 lần.
            $locked = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! $locked->status->canTransitionTo($to)) {
                throw ValidationException::withMessages([
                    'status' => "Không thể chuyển đơn từ “{$locked->status->label()}” sang “{$to->label()}”.",
                ]);
            }

            if ($to === OrderStatus::Cancelled) {
                $this->restock($locked, $actor);
            }

            $locked->status = $to;
            if ($to === OrderStatus::Completed && $locked->payment_method === PaymentMethod::Cod) {
                $locked->payment_status = PaymentStatus::Paid;
            }
            $locked->save();

            $order->setRawAttributes($locked->getAttributes(), true);

            return $order;
        });
    }

    /**
     * Khách tự huỷ: chỉ khi đơn còn chờ xác nhận (đã xác nhận thì phải liên hệ cửa hàng).
     *
     * @throws ValidationException đơn không còn ở trạng thái chờ xác nhận
     */
    public function cancelByCustomer(Order $order, User $customer): Order
    {
        if ($order->status !== OrderStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => 'Chỉ huỷ được đơn đang chờ xác nhận. Vui lòng liên hệ cửa hàng để được hỗ trợ.',
            ]);
        }

        return $this->changeStatus($order, OrderStatus::Cancelled, $customer);
    }

    /**
     * Hoàn kho cho từng dòng của đơn. Sản phẩm đã xoá mềm vẫn hoàn;
     * dòng mất liên kết sản phẩm (product_id = null) thì bỏ qua.
     */
    private function restock(Order $order, User $actor): void
    {
        $items = $order->items()->whereNotNull('product_id')->get();

        $products = Product::withTrashed()
            ->whereKey($items->pluck('product_id'))
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($items as $item) {
            if ($product = $products->get($item->product_id)) {
                $this->stock->increase($product, $item->quantity, StockReason::Cancel, $order, $actor);
            }
        }
    }

    /**
     * Kiểm tra lại từng dòng trên dữ liệu vừa khoá (giỏ có thể đã cũ).
     *
     * @param  Collection<int, CartItem>  $items
     * @param  Collection<int, Product>  $products
     */
    private function ensurePurchasable($items, $products): void
    {
        $errors = [];

        foreach ($items as $item) {
            $item->setRelation('product', $products->get($item->product_id));

            if ($reason = $item->unavailableReason()) {
                $name = $item->product?->name ?? "Sản phẩm #{$item->product_id}";
                $errors[] = "{$name}: {$reason}";
            }
        }

        if ($errors) {
            throw ValidationException::withMessages(['items' => $errors]);
        }
    }

    /**
     * Mã đơn dạng TS + yyMMdd + 4 ký tự, ví dụ TS2611035K7Q.
     */
    private function generateCode(): string
    {
        do {
            $suffix = collect(range(1, 4))
                ->map(fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)])
                ->implode('');
            $code = 'TS'.now()->format('ymd').$suffix;
        } while (Order::where('code', $code)->exists());

        return $code;
    }
}
