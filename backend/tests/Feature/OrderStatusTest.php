<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StockReason;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OrderStatusTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    /**
     * Đơn của khách gồm 2 dòng; kho hiện tại đã bị trừ sẵn (như sau khi đặt).
     *
     * @return array{0: Order, 1: Product, 2: Product}
     */
    private function orderWithItems(OrderStatus $status = OrderStatus::Pending, PaymentMethod $method = PaymentMethod::Cod): array
    {
        $a = Product::factory()->create(['stock' => 8]);
        $b = Product::factory()->create(['stock' => 0]);
        $order = Order::factory()->for($this->customer)->create(['status' => $status, 'payment_method' => $method]);
        OrderItem::factory()->for($order)->for($a)->create(['quantity' => 2]);
        OrderItem::factory()->for($order)->for($b)->create(['quantity' => 3]);

        return [$order, $a, $b];
    }

    private function service(): OrderService
    {
        return app(OrderService::class);
    }

    /**
     * @return array<string, array{OrderStatus, OrderStatus, bool}>
     */
    public static function transitions(): array
    {
        return [
            'pending → confirmed' => [OrderStatus::Pending, OrderStatus::Confirmed, true],
            'pending → cancelled' => [OrderStatus::Pending, OrderStatus::Cancelled, true],
            'pending → shipping' => [OrderStatus::Pending, OrderStatus::Shipping, false],
            'pending → completed' => [OrderStatus::Pending, OrderStatus::Completed, false],
            'confirmed → shipping' => [OrderStatus::Confirmed, OrderStatus::Shipping, true],
            'confirmed → cancelled' => [OrderStatus::Confirmed, OrderStatus::Cancelled, true],
            'confirmed → pending' => [OrderStatus::Confirmed, OrderStatus::Pending, false],
            'shipping → completed' => [OrderStatus::Shipping, OrderStatus::Completed, true],
            'shipping → cancelled' => [OrderStatus::Shipping, OrderStatus::Cancelled, false],
            'completed → cancelled' => [OrderStatus::Completed, OrderStatus::Cancelled, false],
            'cancelled → pending' => [OrderStatus::Cancelled, OrderStatus::Pending, false],
            'pending → pending' => [OrderStatus::Pending, OrderStatus::Pending, false],
        ];
    }

    #[DataProvider('transitions')]
    public function test_transition_rules(OrderStatus $from, OrderStatus $to, bool $allowed): void
    {
        $this->assertSame($allowed, $from->canTransitionTo($to));
    }

    public function test_customer_cancels_pending_order_and_stock_is_restored(): void
    {
        [$order, $a, $b] = $this->orderWithItems();

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$order->code}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status.value', 'cancelled')
            ->assertJsonPath('data.status.label', 'Đã huỷ');

        $this->assertSame(OrderStatus::Cancelled, $order->refresh()->status);
        $this->assertSame(10, $a->refresh()->stock);
        $this->assertSame(3, $b->refresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $a->id, 'change' => 2, 'reason' => StockReason::Cancel->value,
            'order_id' => $order->id, 'user_id' => $this->customer->id,
        ]);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $b->id, 'change' => 3, 'reason' => StockReason::Cancel->value]);
    }

    public function test_customer_cannot_cancel_confirmed_order(): void
    {
        [$order, $a] = $this->orderWithItems(OrderStatus::Confirmed);

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$order->code}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Chỉ huỷ được đơn đang chờ xác nhận. Vui lòng liên hệ cửa hàng để được hỗ trợ.']);

        $this->assertSame(OrderStatus::Confirmed, $order->refresh()->status);
        $this->assertSame(8, $a->refresh()->stock);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_customer_cannot_cancel_other_users_order(): void
    {
        [$order] = $this->orderWithItems();

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson("/api/v1/orders/{$order->code}/cancel")
            ->assertNotFound();

        $this->assertSame(OrderStatus::Pending, $order->refresh()->status);
    }

    public function test_cancelling_twice_restores_stock_only_once(): void
    {
        [$order, $a] = $this->orderWithItems();

        $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->code}/cancel")->assertOk();
        $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->code}/cancel")->assertUnprocessable();

        $this->assertSame(10, $a->refresh()->stock);
        $this->assertSame(1, $a->stockMovements()->count());
    }

    public function test_invalid_transition_is_rejected_with_422(): void
    {
        [$order] = $this->orderWithItems();

        try {
            $this->service()->changeStatus($order, OrderStatus::Completed, $this->admin);
            $this->fail('Phải ném ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(422, $e->status);
            $this->assertSame(['Không thể chuyển đơn từ “Chờ xác nhận” sang “Hoàn thành”.'], $e->errors()['status']);
        }

        $this->assertSame(OrderStatus::Pending, $order->refresh()->status);
    }

    public function test_full_cod_flow_marks_paid_when_completed(): void
    {
        [$order] = $this->orderWithItems(method: PaymentMethod::Cod);

        foreach ([OrderStatus::Confirmed, OrderStatus::Shipping] as $status) {
            $this->service()->changeStatus($order, $status, $this->admin);
            $this->assertSame(PaymentStatus::Unpaid, $order->refresh()->payment_status);
        }

        $updated = $this->service()->changeStatus($order, OrderStatus::Completed, $this->admin);

        $this->assertSame(OrderStatus::Completed, $updated->status);
        $this->assertSame(PaymentStatus::Paid, $order->refresh()->payment_status);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_bank_qr_order_is_not_auto_marked_paid(): void
    {
        [$order] = $this->orderWithItems(OrderStatus::Shipping, PaymentMethod::BankQr);

        $this->service()->changeStatus($order, OrderStatus::Completed, $this->admin);

        $this->assertSame(PaymentStatus::Unpaid, $order->refresh()->payment_status);
    }

    public function test_admin_can_cancel_confirmed_order_and_restock(): void
    {
        [$order, $a] = $this->orderWithItems(OrderStatus::Confirmed);

        $this->service()->changeStatus($order, OrderStatus::Cancelled, $this->admin);

        $this->assertSame(OrderStatus::Cancelled, $order->refresh()->status);
        $this->assertSame(10, $a->refresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $a->id, 'user_id' => $this->admin->id, 'reason' => 'cancel']);
    }

    public function test_cancel_restocks_soft_deleted_product_and_skips_removed_one(): void
    {
        [$order, $a, $b] = $this->orderWithItems();
        $a->delete();
        $order->items()->where('product_id', $b->id)->update(['product_id' => null]);

        $this->service()->changeStatus($order, OrderStatus::Cancelled, $this->customer);

        $this->assertSame(10, Product::withTrashed()->find($a->id)->stock);
        $this->assertDatabaseCount('stock_movements', 1);
    }
}
