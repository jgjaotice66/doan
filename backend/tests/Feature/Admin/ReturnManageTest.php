<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ReturnReason;
use App\Enums\ReturnStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admin xử lý yêu cầu trả hàng: Chờ duyệt → Đã duyệt → Đã nhận hàng (tuỳ chọn nhập lại kho) → Đã hoàn tiền; hoặc Từ chối.
 */
class ReturnManageTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $customer;

    private Order $order;

    private Product $gundam;

    private Product $lego;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->customer = User::factory()->create(['name' => 'Trần Khách']);
        Sanctum::actingAs($this->admin);

        $this->gundam = Product::factory()->create(['stock' => 4]);
        $this->lego = Product::factory()->create(['stock' => 0]);
        $this->order = Order::factory()->for($this->customer)->create([
            'status' => OrderStatus::Completed,
            'payment_method' => PaymentMethod::Cod,
            'payment_status' => PaymentStatus::Paid,
            'subtotal' => 1300000,
            'total' => 1330000,
            'completed_at' => now()->subDays(2),
        ]);
    }

    /** Yêu cầu trả 2 Gundam (500k) + 1 LEGO (300k) → gợi ý hoàn 1.300.000. */
    private function returnRequest(ReturnStatus $status = ReturnStatus::Pending, ?Order $order = null): ReturnRequest
    {
        $order ??= $this->order;
        $gundam = OrderItem::factory()->for($order)->for($this->gundam)->create(['quantity' => 2, 'price' => 500000]);
        $lego = OrderItem::factory()->for($order)->for($this->lego)->create(['quantity' => 1, 'price' => 300000]);

        $request = ReturnRequest::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'status' => $status,
            'reason' => ReturnReason::Defective,
            'description' => 'Hỏng',
            'bank_name' => 'MB Bank',
            'bank_account' => '999988887777',
            'account_name' => 'TRAN KHACH',
        ]);
        $request->items()->create(['order_item_id' => $gundam->id, 'quantity' => 2]);
        $request->items()->create(['order_item_id' => $lego->id, 'quantity' => 1]);
        $request->media()->create(['path' => 'returns/a.jpg', 'type' => 'image']);

        return $request;
    }

    private function act(ReturnRequest $request, string $action, array $data = [])
    {
        return $this->patchJson("/api/v1/admin/returns/{$request->id}/{$action}", $data);
    }

    // ---------- Luồng đầy đủ ----------

    public function test_full_flow_with_partial_restock(): void
    {
        $request = $this->returnRequest();
        [$gundamLine, $legoLine] = $request->items->all();

        $this->act($request, 'approve', ['admin_note' => 'Gửi hàng về kho Q1 giúp shop.'])
            ->assertOk()
            ->assertJsonPath('data.status.value', 'approved')
            ->assertJsonPath('data.admin_note', 'Gửi hàng về kho Q1 giúp shop.')
            ->assertJsonPath('data.allowed_actions', ['receive', 'reject']);

        // Gundam còn tốt → nhập lại kho; LEGO hỏng → không nhập.
        $this->act($request, 'receive', ['items' => [
            ['id' => $gundamLine->id, 'restock' => true],
            ['id' => $legoLine->id, 'restock' => false],
        ]])
            ->assertOk()
            ->assertJsonPath('data.status.value', 'received')
            ->assertJsonPath('data.items.0.restock', true)
            ->assertJsonPath('data.items.1.restock', false);

        $this->assertSame(6, $this->gundam->fresh()->stock);
        $this->assertSame(0, $this->lego->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->gundam->id, 'change' => 2, 'reason' => 'return', 'order_id' => $this->order->id, 'user_id' => $this->admin->id,
        ]);
        $this->assertDatabaseMissing('stock_movements', ['product_id' => $this->lego->id, 'reason' => 'return']);

        // Không nhập số tiền → hoàn đúng số gợi ý (không gồm phí ship).
        $this->act($request, 'refund')
            ->assertOk()
            ->assertJsonPath('data.status.value', 'refunded')
            ->assertJsonPath('data.refund_amount', 1300000)
            ->assertJsonPath('data.allowed_actions', []);

        $fresh = $request->fresh();
        $this->assertNotNull($fresh->reviewed_at);
        $this->assertNotNull($fresh->received_at);
        $this->assertNotNull($fresh->refunded_at);

        // Khách thấy "Đã hoàn tiền" trong đơn.
        Sanctum::actingAs($this->customer);
        $this->getJson("/api/v1/orders/{$this->order->code}")
            ->assertJsonPath('data.returns.0.status.label', 'Đã hoàn tiền')
            ->assertJsonPath('data.returns.0.refund_amount', 1300000);
    }

    public function test_wrong_order_of_steps_is_rejected(): void
    {
        $request = $this->returnRequest();

        $this->act($request, 'receive')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->act($request, 'refund')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->act($request, 'approve')->assertOk();
        $this->act($request, 'approve')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->act($request, 'refund')->assertUnprocessable();

        $this->assertSame(4, $this->gundam->fresh()->stock);
    }

    public function test_receiving_twice_does_not_restock_twice(): void
    {
        $request = $this->returnRequest(ReturnStatus::Approved);
        $line = $request->items->first();

        $this->act($request, 'receive', ['items' => [['id' => $line->id, 'restock' => true]]])->assertOk();
        $this->act($request, 'receive', ['items' => [['id' => $line->id, 'restock' => true]]])->assertUnprocessable();

        $this->assertSame(6, $this->gundam->fresh()->stock);
    }

    public function test_receive_ignores_lines_of_other_requests(): void
    {
        $request = $this->returnRequest(ReturnStatus::Approved);
        $other = $this->returnRequest(ReturnStatus::Approved, Order::factory()->create());

        $this->act($request, 'receive', ['items' => [['id' => $other->items->first()->id, 'restock' => true]]])
            ->assertJsonValidationErrors('items.0.id');
    }

    // ---------- Từ chối ----------

    public function test_reject_requires_a_reason_and_only_before_goods_are_received(): void
    {
        $pending = $this->returnRequest();
        $this->act($pending, 'reject')->assertJsonValidationErrors('admin_note');
        $this->act($pending, 'reject', ['admin_note' => 'Ảnh không cho thấy lỗi sản phẩm.'])
            ->assertOk()
            ->assertJsonPath('data.status.value', 'rejected')
            ->assertJsonPath('data.status.label', 'Từ chối');

        // Đã duyệt nhưng khách không gửi hàng → vẫn từ chối được.
        $approved = $this->returnRequest(ReturnStatus::Approved, Order::factory()->for($this->customer)->create());
        $this->act($approved, 'reject', ['admin_note' => 'Quá hạn gửi hàng.'])->assertOk();

        $received = $this->returnRequest(ReturnStatus::Received, Order::factory()->for($this->customer)->create());
        $this->act($received, 'reject', ['admin_note' => 'x'])->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    // ---------- Số tiền hoàn ----------

    public function test_refund_amount_can_be_edited_but_not_above_what_is_left(): void
    {
        // Đơn 1.330.000; trước đó đã hoàn 200.000 ở một yêu cầu khác → còn hoàn được tối đa 1.130.000.
        ReturnRequest::create([
            'order_id' => $this->order->id, 'user_id' => $this->customer->id, 'status' => ReturnStatus::Refunded,
            'reason' => ReturnReason::Other, 'bank_name' => 'MB', 'bank_account' => '123456', 'account_name' => 'A',
            'refund_amount' => 200000, 'refunded_at' => now()->subDay(),
        ]);
        $request = $this->returnRequest(ReturnStatus::Received);

        $this->getJson("/api/v1/admin/returns/{$request->id}")
            ->assertOk()
            ->assertJsonPath('data.suggested_refund', 1130000) // 1.300.000 bị giới hạn bởi số còn lại
            ->assertJsonPath('data.max_refund', 1130000);

        $this->act($request, 'refund', ['refund_amount' => 1130001])->assertJsonValidationErrors('refund_amount');
        $this->act($request, 'refund', ['refund_amount' => 0])->assertJsonValidationErrors('refund_amount');
        $this->act($request, 'refund', ['refund_amount' => 450000])->assertOk()->assertJsonPath('data.refund_amount', 450000);
    }

    // ---------- Danh sách / chi tiết ----------

    public function test_list_filters_by_status_and_order_code(): void
    {
        $pending = $this->returnRequest();
        $otherOrder = Order::factory()->for($this->customer)->create(['code' => 'TSZZ999']);
        $this->returnRequest(ReturnStatus::Refunded, $otherOrder);

        $this->getJson('/api/v1/admin/returns')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/admin/returns?status=pending')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pending->id)
            ->assertJsonPath('data.0.order.code', $this->order->code)
            ->assertJsonPath('data.0.customer.name', 'Trần Khách')
            ->assertJsonPath('data.0.item_count', 3);
        $this->getJson('/api/v1/admin/returns?q=ZZ999')->assertJsonCount(1, 'data')->assertJsonPath('data.0.order.code', 'TSZZ999');
        $this->getJson('/api/v1/admin/returns?status=lost')->assertJsonValidationErrors('status');
    }

    public function test_detail_has_items_media_and_bank_info(): void
    {
        $request = $this->returnRequest();

        $this->getJson("/api/v1/admin/returns/{$request->id}")
            ->assertOk()
            ->assertJsonPath('data.reason.label', 'Lỗi / hỏng')
            ->assertJsonPath('data.bank_name', 'MB Bank')
            ->assertJsonPath('data.items.0.product_name', $request->items->first()->orderItem->product_name)
            ->assertJsonPath('data.items.0.price', 500000)
            ->assertJsonPath('data.media.0.type', 'image')
            ->assertJsonPath('data.allowed_actions', ['approve', 'reject'])
            ->assertJsonPath('data.order.id', $this->order->id);
    }

    public function test_admin_order_detail_lists_its_return_requests(): void
    {
        $this->returnRequest();

        $this->getJson("/api/v1/admin/orders/{$this->order->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.returns')
            ->assertJsonPath('data.returns.0.status.value', 'pending');
    }

    // ---------- Dashboard ----------

    public function test_refunds_are_subtracted_from_revenue_on_the_refund_day(): void
    {
        $tz = 'Asia/Ho_Chi_Minh';
        $this->travelTo(Carbon::parse('2026-11-15 10:00', $tz));
        $this->order->update(['completed_at' => Carbon::parse('2026-11-10 10:00', $tz)]);
        $request = $this->returnRequest(ReturnStatus::Received);

        $this->act($request, 'refund', ['refund_amount' => 300000])->assertOk();

        $this->getJson('/api/v1/admin/dashboard/summary')
            ->assertJsonPath('data.revenue_today', -300000)
            ->assertJsonPath('data.revenue_month', 1030000);

        $points = collect($this->getJson('/api/v1/admin/dashboard/revenue?range=30d')->json('data.points'))->keyBy('date');
        $this->assertSame(1330000, $points['2026-11-10']['revenue']);
        $this->assertSame(-300000, $points['2026-11-15']['revenue']);
        $this->assertSame(0, $points['2026-11-15']['orders']);
    }

    public function test_dashboard_counts_returns_waiting_for_review(): void
    {
        $this->returnRequest();
        $this->returnRequest(ReturnStatus::Approved, Order::factory()->create());
        $this->returnRequest(ReturnStatus::Rejected, Order::factory()->create());

        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.pending_returns', 1);
    }

    public function test_customer_gets_403(): void
    {
        $request = $this->returnRequest();
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/admin/returns')->assertForbidden();
        $this->act($request, 'approve')->assertForbidden();
    }
}
