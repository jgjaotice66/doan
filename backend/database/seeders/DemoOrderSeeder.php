<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\ProductStatus;
use App\Enums\ReturnReason;
use App\Enums\UserRole;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use App\Services\ReturnService;
use Database\Seeders\Concerns\TravelsInTime;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Đơn hàng mẫu cho dashboard / quản lý đơn / trả hàng.
 *
 * Mọi đơn đi qua đúng OrderService / ReturnService như khi khách và admin thao tác thật,
 * chỉ khác là "lùi đồng hồ" về quá khứ → mã đơn, completed_at, lịch sử kho, doanh thu đều khớp quy tắc nghiệp vụ.
 * Dùng seed cố định cho mt_rand nên lần nào chạy cũng ra cùng một kịch bản.
 */
class DemoOrderSeeder extends Seeder
{
    use TravelsInTime;

    private const RANDOM_SEED = 39;

    /** Đơn cũ nhất cách đây bao nhiêu ngày. */
    private const HISTORY_DAYS = 330;

    private const NOTES = ['Giao giờ hành chính giúp mình.', 'Gọi trước khi giao nhé shop.', 'Gói kỹ giúp mình, quà tặng ạ.', null, null, null];

    /** Kiểu huỷ dùng luân phiên cho các đơn cũ bị huỷ. */
    private const CANCEL_KINDS = ['customer', 'admin', 'paid_refunded'];

    private Carbon $now;

    private User $admin;

    /** @var Collection<int, User> */
    private Collection $customers;

    /** @var array<string, string> email => địa chỉ */
    private array $addresses;

    private int $cancelled = 0;

    public function __construct(private OrderService $orders, private ReturnService $returns) {}

    public function run(): void
    {
        mt_srand(self::RANDOM_SEED);

        try {
            $this->now = now();
            $this->admin = User::where('role', UserRole::Admin)->firstOrFail();
            $this->customers = User::where('role', UserRole::Customer)->orderBy('id')->get();
            $this->addresses = collect(UserSeeder::CUSTOMERS)->pluck('address', 'email')->all();
            $khach = $this->customers->firstWhere('email', 'khach@toystore.test');

            // Đơn cũ: càng gần hiện tại càng nhiều đơn → biểu đồ doanh thu có xu hướng tăng.
            for ($daysAgo = self::HISTORY_DAYS; $daysAgo >= 7; $daysAgo--) {
                $chance = 0.04 + 0.36 * (self::HISTORY_DAYS - $daysAgo) / self::HISTORY_DAYS;
                if ($this->chance($chance)) {
                    $outcome = $this->chance(0.85) ? 'completed' : 'cancel_'.self::CANCEL_KINDS[$this->cancelled++ % count(self::CANCEL_KINDS)];
                    $this->createOrder($this->placedAt($daysAgo), $outcome);
                }
            }

            // Đơn gần đây ở đủ trạng thái đang xử lý (để demo các nút của admin).
            $this->createOrder($this->placedAt(0), 'pending', PaymentMethod::BankQr);            // chờ admin xác nhận tiền
            $this->createOrder($this->placedAt(0), 'pending', PaymentMethod::Cod, $khach);
            $this->createOrder($this->placedAt(1), 'pending_paid', PaymentMethod::BankQr);       // đã nhận tiền, chờ xác nhận đơn
            $this->createOrder($this->placedAt(2), 'cancel_paid_awaiting_refund', PaymentMethod::BankQr);
            $this->createOrder($this->placedAt(3), 'confirmed');
            $this->createOrder($this->placedAt(3), 'confirmed', PaymentMethod::BankQr);
            $this->createOrder($this->placedAt(4), 'shipping', PaymentMethod::Cod, $khach);
            $this->createOrder($this->placedAt(5), 'shipping');

            // Hai đơn của tài khoản khách demo có yêu cầu trả hàng.
            $refunded = $this->createOrder($this->placedAt(13), 'completed', PaymentMethod::BankQr, $khach, 2);
            $this->returnFlow($refunded, ReturnReason::Defective, 'Hộp móp một góc, một khớp tay bị lỏng ngay khi mở.', full: true);

            $pending = $this->createOrder($this->placedAt(8), 'completed', PaymentMethod::Cod, $khach, 2);
            $this->returnFlow($pending, ReturnReason::MissingParts, 'Thiếu một túi phụ kiện so với hướng dẫn trong hộp.', full: false);
        } finally {
            mt_srand();
        }
    }

    /**
     * Đặt một đơn qua giỏ hàng như khách thật, rồi đưa đơn tới trạng thái $outcome.
     */
    private function createOrder(Carbon $placedAt, string $outcome, ?PaymentMethod $method = null, ?User $customer = null, ?int $lines = null): Order
    {
        // Chỉ chọn khách đã đăng ký trước thời điểm đặt đơn.
        $registered = $this->customers->filter(fn (User $u) => $u->created_at->lessThanOrEqualTo($placedAt))->values();
        $customer ??= $registered[mt_rand(0, $registered->count() - 1)];
        $method ??= $this->chance(0.5) ? PaymentMethod::BankQr : PaymentMethod::Cod;
        // Khách tự huỷ chỉ được khi chưa trả tiền → các đơn này để COD cho đúng luật.
        if ($outcome === 'cancel_customer' || $outcome === 'cancel_admin') {
            $method = PaymentMethod::Cod;
        }
        if (str_starts_with($outcome, 'cancel_paid')) {
            $method = PaymentMethod::BankQr;
        }

        $order = $this->at($placedAt, function () use ($customer, $placedAt, $method, $lines) {
            foreach ($this->pickProducts($placedAt, $lines ?? $this->weighted([1 => 55, 2 => 35, 3 => 10])) as $productId => $quantity) {
                $customer->cartItems()->create(['product_id' => $productId, 'quantity' => $quantity]);
            }

            return $this->orders->place($customer, [
                'recipient_name' => $customer->name,
                'phone' => $customer->phone,
                'address' => $this->addresses[$customer->email] ?? UserSeeder::CUSTOMERS[0]['address'],
                'note' => self::NOTES[mt_rand(0, count(self::NOTES) - 1)],
                'payment_method' => $method->value,
            ]);
        });

        $t = $placedAt->copy();
        // Mỗi bước xảy ra sau bước trước một khoảng ngẫu nhiên (phút).
        $step = function (int $minMinutes, int $maxMinutes) use (&$t): Carbon {
            return $t = $this->clamp($t->copy()->addMinutes(mt_rand($minMinutes, $maxMinutes)));
        };

        if ($outcome === 'cancel_customer') {
            $this->at($step(30, 180), fn () => $this->orders->cancelByCustomer($order, $customer));

            return $order;
        }

        // Chuyển khoản: khách chuyển tiền sau khi đặt, admin bấm "Đã nhận tiền" rồi mới xác nhận đơn.
        $paysFirst = $method === PaymentMethod::BankQr && $outcome !== 'pending';
        if ($paysFirst) {
            $this->at($step(20, 150), fn () => $this->orders->markPaid($order));
        }
        if (in_array($outcome, ['pending', 'pending_paid'], true)) {
            return $order;
        }

        if (str_starts_with($outcome, 'cancel_paid')) {
            $this->at($step(60, 240), fn () => $this->orders->changeStatus($order, OrderStatus::Cancelled, $this->admin));
            if ($outcome === 'cancel_paid_refunded') {
                $this->at($step(600, 1440), fn () => $this->orders->markRefunded($order));
            }

            return $order;
        }

        $this->at($step(120, 480), fn () => $this->orders->changeStatus($order, OrderStatus::Confirmed, $this->admin));
        if ($outcome === 'cancel_admin') {
            $this->at($step(120, 600), fn () => $this->orders->changeStatus($order, OrderStatus::Cancelled, $this->admin));

            return $order;
        }
        if ($outcome === 'confirmed') {
            return $order;
        }

        $this->at($step(720, 1800), fn () => $this->orders->changeStatus($order, OrderStatus::Shipping, $this->admin));
        if ($outcome === 'shipping') {
            return $order;
        }

        $this->at($step(1440, 3600), fn () => $this->orders->changeStatus($order, OrderStatus::Completed, $this->admin));

        return $order;
    }

    /**
     * Khách gửi yêu cầu trả 1 món sau khi nhận hàng 1 ngày.
     * $full = true: admin duyệt → nhận hàng (nhập lại kho) → hoàn tiền. Ngược lại để chờ duyệt.
     */
    private function returnFlow(Order $order, ReturnReason $reason, string $description, bool $full): void
    {
        $order->refresh()->load('items.product');
        $item = $order->items->first();

        $t = $order->completed_at->copy()->addHours(20);
        $request = $this->at($this->clamp($t), fn () => $this->returns->create($order, $order->user, [
            'reason' => $reason->value,
            'description' => $description,
            'bank_name' => 'Vietcombank',
            'bank_account' => '0071000123456',
            'account_name' => $order->user->name,
            'items' => [['order_item_id' => $item->id, 'quantity' => 1]],
        ], [UploadedFile::fake()->image('anh-san-pham.jpg', 800, 600)]));

        if (! $full) {
            return;
        }

        $this->at($this->clamp($t->addHours(18)), fn () => $this->returns->approve($request, 'Shop đã xem ảnh, bạn gửi hàng về giúp shop nhé.'));
        $line = $request->items()->first();
        $this->at($this->clamp($t->addHours(46)), fn () => $this->returns->receive($request, $this->admin, [['id' => $line->id, 'restock' => true]]));
        $this->at($this->clamp($t->addHours(20)), fn () => $this->returns->refund($request, null));
    }

    /**
     * Chọn $lines sản phẩm khác nhau đang bán được tại thời điểm $at (đã "nhập kho", còn đủ hàng).
     * Sản phẩm nổi bật được chọn nhiều hơn → top bán chạy có thứ hạng rõ ràng.
     * Món từ 3 triệu trở lên ít được chọn hơn (1/3) để doanh thu bám theo số đơn, không bị vài món đắt làm giật biểu đồ.
     *
     * @return array<int, int> product_id => số lượng
     */
    private function pickProducts(Carbon $at, int $lines): array
    {
        $candidates = Product::query()
            ->where('status', ProductStatus::Active)
            ->where('created_at', '<=', $at)
            ->where('stock', '>=', 6)
            ->orderBy('id')
            ->get(['id', 'is_featured', 'price', 'sale_price']);

        $weights = $candidates->mapWithKeys(fn (Product $p) => [
            $p->id => (($p->is_featured ? 4 : 1) + ($p->id % 4 === 0 ? 2 : 0)) * ($p->final_price >= 3_000_000 ? 1 : 3),
        ])->all();
        $picked = [];
        while (count($picked) < min($lines, count($weights))) {
            $id = $this->weighted($weights);
            unset($weights[$id]);
            $picked[$id] = $this->chance(0.8) ? 1 : 2;
        }

        return $picked;
    }

    /** Giờ đặt hàng: trong khung 8h–22h của ngày cách đây $daysAgo ngày, không vượt quá hiện tại. */
    private function placedAt(int $daysAgo): Carbon
    {
        $at = $this->now->copy()->subDays($daysAgo)->setTime(mt_rand(8, 21), mt_rand(0, 59));

        return $daysAgo === 0 ? $this->clamp($at->min($this->now->copy()->subHours(2))) : $at;
    }

    /** Mọi mốc thời gian phải ở quá khứ (dashboard chỉ đếm tới hiện tại). */
    private function clamp(Carbon $at): Carbon
    {
        $latest = $this->now->copy()->subMinutes(5);

        return $at->greaterThan($latest) ? $latest : $at;
    }

    private function chance(float $probability): bool
    {
        return mt_rand() / mt_getrandmax() < $probability;
    }

    /**
     * @param  array<int, int>  $weights  giá trị => trọng số
     */
    private function weighted(array $weights): int
    {
        $roll = mt_rand(1, array_sum($weights));
        foreach ($weights as $value => $weight) {
            if (($roll -= $weight) <= 0) {
                return $value;
            }
        }

        return array_key_last($weights);
    }
}
