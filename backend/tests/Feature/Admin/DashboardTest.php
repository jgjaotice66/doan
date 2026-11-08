<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Quy ước doanh thu: tổng `total` của đơn đã hoàn thành VÀ đã thu tiền (không tính đơn hoàn tiền),
 * tính vào ngày hoàn thành (completed_at) theo giờ Việt Nam.
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private const TZ = 'Asia/Ho_Chi_Minh';

    protected function setUp(): void
    {
        parent::setUp();

        // "Bây giờ" = 10:00 sáng 15/11/2026 giờ VN.
        $this->travelTo(Carbon::parse('2026-11-15 10:00', self::TZ));
        Sanctum::actingAs(User::factory()->admin()->create(['created_at' => now()->subYear()]));
    }

    /** Đơn hoàn thành + đã thu tiền vào thời điểm $at (giờ VN). */
    private function sale(int $total, string $at, array $overrides = []): Order
    {
        return Order::factory()->create([
            'total' => $total,
            'status' => OrderStatus::Completed,
            'payment_status' => PaymentStatus::Paid,
            'completed_at' => Carbon::parse($at, self::TZ),
            'created_at' => Carbon::parse($at, self::TZ)->subDays(2),
            ...$overrides,
        ]);
    }

    // ---------- Doanh thu: tính gì / không tính gì ----------

    public function test_only_completed_and_paid_orders_count_as_revenue(): void
    {
        $this->sale(500000, '2026-11-15 09:00');
        // Không tính: đang chờ, đang giao (dù đã trả tiền), đã huỷ, đã hoàn tiền, hoàn thành nhưng chưa thu tiền.
        Order::factory()->create(['total' => 100000, 'status' => OrderStatus::Pending]);
        Order::factory()->paid()->create(['total' => 200000, 'status' => OrderStatus::Shipping]);
        Order::factory()->paid()->create(['total' => 300000, 'status' => OrderStatus::Cancelled]);
        $this->sale(400000, '2026-11-15 08:00', ['payment_status' => PaymentStatus::Refunded]);
        $this->sale(600000, '2026-11-15 07:00', ['payment_status' => PaymentStatus::Unpaid]);

        $this->getJson('/api/v1/admin/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.revenue_today', 500000)
            ->assertJsonPath('data.revenue_month', 500000);
    }

    public function test_today_follows_vietnam_time_not_utc(): void
    {
        $this->sale(100000, '2026-11-15 00:30'); // 17:30 UTC ngày 14 nhưng là hôm nay ở VN
        $this->sale(200000, '2026-11-14 23:30'); // hôm qua ở VN

        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.revenue_today', 100000);
    }

    public function test_month_revenue_is_compared_with_same_period_last_month(): void
    {
        $this->sale(300000, '2026-11-02 10:00');
        $this->sale(100000, '2026-11-14 10:00');
        $this->sale(200000, '2026-10-10 10:00'); // cùng kỳ tháng trước (1–15/10)
        $this->sale(900000, '2026-10-20 10:00'); // sau ngày 15/10 → không so
        $this->sale(700000, '2026-10-31 23:00');

        $this->getJson('/api/v1/admin/dashboard/summary')
            ->assertJsonPath('data.revenue_month', 400000)
            ->assertJsonPath('data.revenue_last_month_same_period', 200000)
            ->assertJsonPath('data.revenue_month_change', 100); // +100%
    }

    public function test_month_change_is_null_when_last_month_had_no_revenue(): void
    {
        $this->sale(300000, '2026-11-02 10:00');

        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.revenue_month_change', null);
    }

    // ---------- Các con số khác của summary ----------

    public function test_summary_counts(): void
    {
        $customer = User::factory()->create(['created_at' => Carbon::parse('2026-11-03', self::TZ)]);
        User::factory()->create(['created_at' => Carbon::parse('2026-10-20', self::TZ)]); // tháng trước
        User::factory()->admin()->create(['created_at' => now()]); // admin không tính là khách

        $cod = ['payment_method' => PaymentMethod::Cod];
        Order::factory()->for($customer)->create(['created_at' => now()->subHour(), ...$cod]); // pending, hôm nay
        Order::factory()->for($customer)->create([
            'created_at' => now()->subHours(2), 'payment_method' => PaymentMethod::BankQr,
        ]); // pending + chờ chuyển khoản, hôm nay
        Order::factory()->for($customer)->create(['created_at' => now()->subDays(3), 'status' => OrderStatus::Confirmed, ...$cod]);
        // Đã huỷ nhưng khách đã chuyển tiền → cần hoàn tiền.
        Order::factory()->for($customer)->paid()->create([
            'created_at' => now()->subDays(3), 'status' => OrderStatus::Cancelled, 'payment_method' => PaymentMethod::BankQr,
        ]);

        Product::factory()->create(['stock' => 0]);
        Product::factory()->create(['stock' => 3]);
        Product::factory()->create(['stock' => 50]);

        $this->getJson('/api/v1/admin/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.orders_today', 2)
            ->assertJsonPath('data.pending_orders', 2)
            ->assertJsonPath('data.awaiting_payment', 1)
            ->assertJsonPath('data.needs_refund', 1)
            ->assertJsonPath('data.new_customers_month', 1)
            ->assertJsonPath('data.low_stock', 2)
            ->assertJsonPath('data.out_of_stock', 1)
            ->assertJsonPath('data.low_stock_threshold', 5);
    }

    // ---------- Biểu đồ doanh thu ----------

    public function test_revenue_30d_has_one_point_per_day_with_zero_for_empty_days(): void
    {
        $this->sale(100000, '2026-11-15 09:00');
        $this->sale(250000, '2026-11-15 08:00');
        $this->sale(300000, '2026-11-10 20:00');
        $this->sale(400000, '2026-10-17 12:00'); // ngày đầu của khoảng 30 ngày
        $this->sale(999000, '2026-10-16 23:00'); // ngoài khoảng

        $response = $this->getJson('/api/v1/admin/dashboard/revenue?range=30d')
            ->assertOk()
            ->assertJsonCount(30, 'data.points')
            ->assertJsonPath('data.range', '30d')
            ->assertJsonPath('data.total_revenue', 1050000)
            ->assertJsonPath('data.total_orders', 4)
            ->assertJsonPath('data.points.0', ['date' => '2026-10-17', 'label' => '17/10', 'revenue' => 400000, 'orders' => 1])
            ->assertJsonPath('data.points.29', ['date' => '2026-11-15', 'label' => '15/11', 'revenue' => 350000, 'orders' => 2]);

        $points = collect($response->json('data.points'))->keyBy('date');
        $this->assertSame(300000, $points['2026-11-10']['revenue']);
        $this->assertSame(0, $points['2026-11-11']['revenue']);
        $this->assertSame(0, $points['2026-11-11']['orders']);
    }

    public function test_revenue_12m_has_one_point_per_month(): void
    {
        $this->sale(100000, '2026-11-01 08:00');
        $this->sale(200000, '2026-03-31 22:00');
        $this->sale(300000, '2025-12-05 10:00'); // tháng đầu khoảng 12 tháng
        $this->sale(999000, '2025-11-30 10:00'); // ngoài khoảng

        $response = $this->getJson('/api/v1/admin/dashboard/revenue?range=12m')
            ->assertOk()
            ->assertJsonCount(12, 'data.points')
            ->assertJsonPath('data.total_revenue', 600000)
            ->assertJsonPath('data.points.0', ['date' => '2025-12', 'label' => 'T12/2025', 'revenue' => 300000, 'orders' => 1])
            ->assertJsonPath('data.points.11', ['date' => '2026-11', 'label' => 'T11/2026', 'revenue' => 100000, 'orders' => 1]);

        $points = collect($response->json('data.points'))->keyBy('date');
        $this->assertSame(200000, $points['2026-03']['revenue']);
        $this->assertSame(0, $points['2026-04']['revenue']);
    }

    public function test_revenue_defaults_to_30d_and_rejects_unknown_range(): void
    {
        $this->getJson('/api/v1/admin/dashboard/revenue')->assertOk()->assertJsonPath('data.range', '30d');
        $this->getJson('/api/v1/admin/dashboard/revenue?range=7y')->assertJsonValidationErrors('range');
    }

    // ---------- Bán chạy / trạng thái đơn ----------

    public function test_top_products_by_quantity_sold_in_counted_orders(): void
    {
        $gundam = Product::factory()->create(['name' => 'Gundam RX-78']);
        $lego = Product::factory()->create(['name' => 'LEGO Technic']);
        $funko = Product::factory()->create(['name' => 'Funko Pop']);

        $done = $this->sale(0, '2026-11-10 10:00');
        $done2 = $this->sale(0, '2026-11-12 10:00');
        OrderItem::factory()->for($done)->for($gundam)->create(['quantity' => 2, 'price' => 500000]);
        OrderItem::factory()->for($done2)->for($gundam)->create(['quantity' => 1, 'price' => 450000]);
        OrderItem::factory()->for($done)->for($lego)->create(['quantity' => 5, 'price' => 100000]);
        OrderItem::factory()->for($done2)->for($funko)->create(['quantity' => 1, 'price' => 300000]);
        // Đơn huỷ / chưa hoàn thành không tính.
        $cancelled = Order::factory()->create(['status' => OrderStatus::Cancelled]);
        OrderItem::factory()->for($cancelled)->for($funko)->create(['quantity' => 50, 'price' => 300000]);

        $this->getJson('/api/v1/admin/dashboard/top-products?limit=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.product_id', $lego->id)
            ->assertJsonPath('data.0.name', 'LEGO Technic')
            ->assertJsonPath('data.0.quantity', 5)
            ->assertJsonPath('data.0.revenue', 500000)
            ->assertJsonPath('data.1.product_id', $gundam->id)
            ->assertJsonPath('data.1.quantity', 3)
            ->assertJsonPath('data.1.revenue', 1450000);

        $this->getJson('/api/v1/admin/dashboard/top-products?limit=99')->assertJsonValidationErrors('limit');
    }

    public function test_order_status_lists_every_status_including_zero(): void
    {
        Order::factory()->count(2)->create();
        Order::factory()->create(['status' => OrderStatus::Shipping]);

        $response = $this->getJson('/api/v1/admin/dashboard/order-status')
            ->assertOk()
            ->assertJsonCount(count(OrderStatus::cases()), 'data');

        $byStatus = collect($response->json('data'))->keyBy('value');
        $this->assertSame(2, $byStatus['pending']['count']);
        $this->assertSame(1, $byStatus['shipping']['count']);
        $this->assertSame(0, $byStatus['completed']['count']);
        $this->assertSame('Chờ xác nhận', $byStatus['pending']['label']);
    }

    // ---------- completed_at ----------

    public function test_completing_an_order_records_completed_at(): void
    {
        $order = Order::factory()->create(['status' => OrderStatus::Shipping, 'payment_method' => PaymentMethod::Cod]);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();

        $this->assertTrue($order->fresh()->completed_at->equalTo(now()));
        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.revenue_today', $order->total);
    }

    public function test_customer_gets_403(): void
    {
        Sanctum::actingAs(User::factory()->create());

        foreach (['summary', 'revenue', 'top-products', 'order-status'] as $endpoint) {
            $this->getJson("/api/v1/admin/dashboard/{$endpoint}")->assertForbidden();
        }
    }
}
