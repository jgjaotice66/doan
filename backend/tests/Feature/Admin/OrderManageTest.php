<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StockReason;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderManageTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->customer = User::factory()->create(['name' => 'Nguyễn Văn Khách', 'email' => 'khach@example.com']);
        Sanctum::actingAs($this->admin);
    }

    private function order(array $attributes = []): Order
    {
        return Order::factory()->for($this->customer)->create($attributes);
    }

    // ---------- Danh sách ----------

    public function test_admin_sees_orders_of_all_customers_newest_first(): void
    {
        $old = $this->order(['created_at' => now()->subDays(2)]);
        $other = Order::factory()->create(['created_at' => now()->subDay()]);
        $new = $this->order();
        OrderItem::factory()->for($new)->create(['quantity' => 2]);
        OrderItem::factory()->for($new)->create(['quantity' => 3]);

        $response = $this->getJson('/api/v1/admin/orders')->assertOk();

        $this->assertSame([$new->id, $other->id, $old->id], array_column($response->json('data'), 'id'));
        $response
            ->assertJsonPath('data.0.item_count', 5)
            ->assertJsonPath('data.0.customer.email', 'khach@example.com')
            ->assertJsonPath('meta.total', 3);
    }

    public function test_filters_by_status_payment_method_and_payment_status(): void
    {
        $target = $this->order(['status' => OrderStatus::Confirmed, 'payment_method' => PaymentMethod::BankQr]);
        $this->order(['status' => OrderStatus::Confirmed, 'payment_method' => PaymentMethod::Cod]);
        $this->order(['status' => OrderStatus::Pending, 'payment_method' => PaymentMethod::BankQr]);
        $this->order(['status' => OrderStatus::Confirmed, 'payment_method' => PaymentMethod::BankQr, 'payment_status' => PaymentStatus::Paid]);

        $this->getJson('/api/v1/admin/orders?status=confirmed&payment_method=bank_qr&payment_status=unpaid')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);
    }

    public function test_awaiting_payment_filter_lists_only_open_unpaid_bank_transfers(): void
    {
        $waiting = $this->order(['payment_method' => PaymentMethod::BankQr, 'status' => OrderStatus::Confirmed]);
        $this->order(['payment_method' => PaymentMethod::BankQr, 'status' => OrderStatus::Cancelled]);
        $this->order(['payment_method' => PaymentMethod::BankQr, 'payment_status' => PaymentStatus::Paid]);
        $this->order(['payment_method' => PaymentMethod::Cod]);

        $this->getJson('/api/v1/admin/orders?awaiting_payment=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $waiting->id)
            ->assertJsonPath('data.0.can_mark_paid', true);
    }

    public function test_search_by_code_phone_or_recipient_name(): void
    {
        $byCode = $this->order(['code' => 'TS261107ABCD']);
        $byPhone = $this->order(['phone' => '0911222333']);
        $byName = $this->order(['recipient_name' => 'Trần Thị Mua']);

        $this->getJson('/api/v1/admin/orders?q=107ABC')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $byCode->id);
        $this->getJson('/api/v1/admin/orders?q=1222333')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $byPhone->id);
        $this->getJson('/api/v1/admin/orders?q=thị mua')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $byName->id);
    }

    public function test_filters_by_date_range_inclusive(): void
    {
        $this->order(['created_at' => '2026-11-01 23:59:00']);
        $first = $this->order(['created_at' => '2026-11-02 00:00:00']);
        $last = $this->order(['created_at' => '2026-11-05 23:59:00']);
        $this->order(['created_at' => '2026-11-06 00:00:00']);

        $ids = array_column(
            $this->getJson('/api/v1/admin/orders?from=2026-11-02&to=2026-11-05')->assertOk()->json('data'),
            'id',
        );

        $this->assertEqualsCanonicalizing([$first->id, $last->id], $ids);
    }

    public function test_invalid_filters_return_422(): void
    {
        $this->getJson('/api/v1/admin/orders?status=lost&payment_method=card&from=2026-11-05&to=2026-11-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'payment_method', 'to']);
    }

    // ---------- Chi tiết ----------

    public function test_show_returns_items_customer_and_allowed_next_statuses(): void
    {
        $order = $this->order(['status' => OrderStatus::Pending, 'payment_method' => PaymentMethod::BankQr]);
        OrderItem::factory()->for($order)->create(['product_name' => 'Gundam RX-78', 'quantity' => 1]);

        $this->getJson("/api/v1/admin/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.code', $order->code)
            ->assertJsonPath('data.items.0.product_name', 'Gundam RX-78')
            ->assertJsonPath('data.customer.name', 'Nguyễn Văn Khách')
            ->assertJsonPath('data.allowed_next', [
                ['value' => 'confirmed', 'label' => 'Đã xác nhận'],
                ['value' => 'cancelled', 'label' => 'Đã huỷ'],
            ])
            ->assertJsonPath('data.can_mark_paid', true);
    }

    public function test_show_missing_order_returns_404(): void
    {
        $this->getJson('/api/v1/admin/orders/999999')->assertNotFound();
    }

    // ---------- Chuyển trạng thái ----------

    public function test_admin_moves_order_through_the_flow_and_cod_becomes_paid_on_completion(): void
    {
        $order = $this->order(['payment_method' => PaymentMethod::Cod]);

        foreach (['confirmed', 'shipping'] as $status) {
            $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => $status])
                ->assertOk()
                ->assertJsonPath('data.status.value', $status)
                ->assertJsonPath('data.payment_status.value', 'unpaid');
        }

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.status.value', 'completed')
            ->assertJsonPath('data.payment_status.value', 'paid')
            ->assertJsonPath('data.allowed_next', []);
    }

    public function test_admin_cancelling_confirmed_order_restocks_products(): void
    {
        $product = Product::factory()->create(['stock' => 4]);
        $order = $this->order(['status' => OrderStatus::Confirmed]);
        OrderItem::factory()->for($order)->for($product)->create(['quantity' => 3]);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status.value', 'cancelled');

        $this->assertSame(7, $product->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'order_id' => $order->id,
            'change' => 3,
            'reason' => StockReason::Cancel->value,
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_invalid_transition_returns_422_and_keeps_order_unchanged(): void
    {
        $order = $this->order(['status' => OrderStatus::Shipping]);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertSame(OrderStatus::Shipping, $order->fresh()->status);
    }

    public function test_status_must_be_a_known_value(): void
    {
        $order = $this->order();

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'lost'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Trạng thái không hợp lệ.']);
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    // ---------- Xác nhận đã nhận tiền ----------

    public function test_marking_bank_transfer_paid_shows_up_for_the_customer(): void
    {
        $order = $this->order(['payment_method' => PaymentMethod::BankQr]);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/payment")
            ->assertOk()
            ->assertJsonPath('data.payment_status.value', 'paid')
            ->assertJsonPath('data.can_mark_paid', false)
            ->assertJsonPath('data.status.value', 'pending');

        Sanctum::actingAs($this->customer);
        $this->getJson("/api/v1/orders/{$order->code}")
            ->assertOk()
            ->assertJsonPath('data.payment_status.value', 'paid')
            ->assertJsonPath('data.qr_url', null);
    }

    public function test_marking_cod_order_paid_returns_422(): void
    {
        $order = $this->order(['payment_method' => PaymentMethod::Cod]);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/payment")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment');

        $this->assertSame(PaymentStatus::Unpaid, $order->fresh()->payment_status);
    }

    public function test_cannot_mark_cancelled_or_already_paid_order(): void
    {
        $cancelled = $this->order(['payment_method' => PaymentMethod::BankQr, 'status' => OrderStatus::Cancelled]);
        $paid = $this->order(['payment_method' => PaymentMethod::BankQr, 'payment_status' => PaymentStatus::Paid]);

        $this->patchJson("/api/v1/admin/orders/{$cancelled->id}/payment")->assertUnprocessable()->assertJsonValidationErrors('payment');
        $this->patchJson("/api/v1/admin/orders/{$paid->id}/payment")->assertUnprocessable()->assertJsonValidationErrors('payment');

        $this->assertSame(PaymentStatus::Unpaid, $cancelled->fresh()->payment_status);
    }

    // ---------- Phân quyền ----------

    public function test_customer_cannot_use_admin_order_endpoints(): void
    {
        $order = $this->order(['payment_method' => PaymentMethod::BankQr]);
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/admin/orders')->assertForbidden();
        $this->getJson("/api/v1/admin/orders/{$order->id}")->assertForbidden();
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'confirmed'])->assertForbidden();
        $this->patchJson("/api/v1/admin/orders/{$order->id}/payment")->assertForbidden();

        $this->assertSame(OrderStatus::Pending, $order->fresh()->status);
        $this->assertSame(PaymentStatus::Unpaid, $order->fresh()->payment_status);
    }
}
