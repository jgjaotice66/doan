<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ReturnStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Khách gửi yêu cầu trả hàng cho đơn đã hoàn thành (trong 10 ngày), kèm ảnh/video bằng chứng.
 */
class ReturnRequestTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private Order $order;

    private OrderItem $gundam; // 2 cái × 500.000

    private OrderItem $lego; // 1 cái × 300.000

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->customer = User::factory()->create();
        Sanctum::actingAs($this->customer);

        $this->order = $this->completedOrder(now()->subDays(2));
        $this->gundam = OrderItem::factory()->for($this->order)->for(Product::factory())->create(['quantity' => 2, 'price' => 500000]);
        $this->lego = OrderItem::factory()->for($this->order)->for(Product::factory())->create(['quantity' => 1, 'price' => 300000]);
    }

    private function completedOrder($completedAt, ?User $owner = null): Order
    {
        return Order::factory()->for($owner ?? $this->customer)->create([
            'status' => OrderStatus::Completed,
            'payment_method' => PaymentMethod::Cod,
            'payment_status' => PaymentStatus::Paid,
            'subtotal' => 1300000,
            'total' => 1330000,
            'completed_at' => $completedAt,
        ]);
    }

    /** Yêu cầu hợp lệ: trả 1 Gundam, 1 ảnh + 1 video. */
    private function payload(array $overrides = []): array
    {
        return [
            'reason' => 'defective',
            'description' => 'Gundam bị gãy tay khi mở hộp.',
            'items' => [['order_item_id' => $this->gundam->id, 'quantity' => 1]],
            'media' => [
                UploadedFile::fake()->image('loi.jpg', 800, 600),
                UploadedFile::fake()->create('mo-hop.mp4', 2048, 'video/mp4'),
            ],
            'bank_name' => 'Vietcombank',
            'bank_account' => '0123456789',
            'account_name' => 'NGUYEN VAN A',
            ...$overrides,
        ];
    }

    private function submit(array $overrides = [], ?Order $order = null): TestResponse
    {
        $code = ($order ?? $this->order)->code;

        return $this->post("/api/v1/orders/{$code}/returns", $this->payload($overrides), ['Accept' => 'application/json']);
    }

    // ---------- Tạo yêu cầu ----------

    public function test_customer_creates_return_request_with_evidence(): void
    {
        $response = $this->submit()
            ->assertCreated()
            ->assertJsonPath('data.status.value', 'pending')
            ->assertJsonPath('data.status.label', 'Chờ duyệt')
            ->assertJsonPath('data.reason.value', 'defective')
            ->assertJsonPath('data.items.0.order_item_id', $this->gundam->id)
            ->assertJsonPath('data.items.0.quantity', 1)
            ->assertJsonPath('data.suggested_refund', 500000)
            ->assertJsonPath('data.bank_account', '0123456789')
            ->assertJsonCount(2, 'data.media')
            ->assertJsonPath('data.media.0.type', 'image')
            ->assertJsonPath('data.media.1.type', 'video');

        $request = ReturnRequest::findOrFail($response->json('data.id'));
        $this->assertSame($this->customer->id, $request->user_id);
        $this->assertSame(ReturnStatus::Pending, $request->status);
        foreach ($request->media as $media) {
            $this->assertStringStartsWith('returns/', $media->path);
            Storage::disk('public')->assertExists($media->path);
        }
    }

    public function test_order_detail_shows_return_window_and_requests(): void
    {
        $this->getJson("/api/v1/orders/{$this->order->code}")
            ->assertOk()
            ->assertJsonPath('data.can_request_return', true)
            ->assertJsonPath('data.return_deadline', $this->order->completed_at->copy()->addDays(10)->toJSON())
            ->assertJsonPath('data.items.0.returnable_quantity', 2)
            ->assertJsonCount(0, 'data.returns');

        $this->submit()->assertCreated();

        // Đã có yêu cầu đang mở → không gửi thêm được, thấy yêu cầu trong đơn.
        $this->getJson("/api/v1/orders/{$this->order->code}")
            ->assertJsonPath('data.can_request_return', false)
            ->assertJsonCount(1, 'data.returns')
            ->assertJsonPath('data.returns.0.status.value', 'pending')
            ->assertJsonPath('data.items.0.returnable_quantity', 1);
    }

    public function test_only_completed_orders_can_be_returned(): void
    {
        $this->order->update(['status' => OrderStatus::Shipping, 'completed_at' => null]);

        $this->submit()->assertUnprocessable()->assertJsonValidationErrors('order');
        $this->assertSame(0, ReturnRequest::count());
    }

    public function test_return_window_is_ten_days_after_completion(): void
    {
        $this->order->update(['completed_at' => now()->subDays(10)->subMinute()]);
        $this->submit()->assertUnprocessable()->assertJsonValidationErrors('order');

        $this->order->update(['completed_at' => now()->subDays(10)->addMinute()]);
        $this->submit()->assertCreated();
    }

    public function test_quantity_cannot_exceed_what_is_left_to_return(): void
    {
        $this->submit(['items' => [['order_item_id' => $this->gundam->id, 'quantity' => 3]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.quantity');

        // Lần trước đã trả xong 1 Gundam → lần này chỉ còn trả được 1.
        $done = $this->submit()->assertCreated()->json('data.id');
        ReturnRequest::whereKey($done)->update(['status' => ReturnStatus::Refunded]);

        $this->submit(['items' => [['order_item_id' => $this->gundam->id, 'quantity' => 2]]])
            ->assertJsonValidationErrors('items.0.quantity');
        $this->submit(['items' => [
            ['order_item_id' => $this->gundam->id, 'quantity' => 1],
            ['order_item_id' => $this->lego->id, 'quantity' => 1],
        ]])->assertCreated()->assertJsonPath('data.suggested_refund', 800000);
    }

    public function test_rejected_request_does_not_use_up_quantity_and_allows_a_new_request(): void
    {
        $first = $this->submit(['items' => [['order_item_id' => $this->gundam->id, 'quantity' => 2]]])->assertCreated()->json('data.id');

        // Đang mở → không gửi thêm.
        $this->submit()->assertUnprocessable()->assertJsonValidationErrors('order');

        ReturnRequest::whereKey($first)->update(['status' => ReturnStatus::Rejected]);
        $this->submit(['items' => [['order_item_id' => $this->gundam->id, 'quantity' => 2]]])->assertCreated();
    }

    public function test_items_must_belong_to_the_order_and_not_repeat(): void
    {
        $other = OrderItem::factory()->create();

        $this->submit(['items' => [['order_item_id' => $other->id, 'quantity' => 1]]])
            ->assertJsonValidationErrors('items.0.order_item_id');
        $this->submit(['items' => [
            ['order_item_id' => $this->gundam->id, 'quantity' => 1],
            ['order_item_id' => $this->gundam->id, 'quantity' => 1],
        ]])->assertJsonValidationErrors('items.1.order_item_id');
        $this->submit(['items' => []])->assertJsonValidationErrors('items');
    }

    public function test_evidence_is_required_and_checked(): void
    {
        $this->submit(['media' => []])->assertJsonValidationErrors('media');
        $this->submit(['media' => [UploadedFile::fake()->create('hoa-don.pdf', 100, 'application/pdf')]])
            ->assertJsonValidationErrors('media.0');
        // Ảnh tối đa 5 MB, video tối đa 50 MB.
        $this->submit(['media' => [UploadedFile::fake()->image('to.jpg')->size(5121)]])
            ->assertJsonValidationErrors('media.0');
        $this->submit(['media' => [UploadedFile::fake()->create('dai.mp4', 51201, 'video/mp4')]])
            ->assertJsonValidationErrors('media.0');
        $this->submit(['media' => array_map(fn ($i) => UploadedFile::fake()->image("{$i}.jpg"), range(1, 6))])
            ->assertJsonValidationErrors('media');

        $this->assertSame(0, ReturnRequest::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_bank_account_is_required_and_other_reason_needs_description(): void
    {
        $this->submit(['bank_name' => '', 'bank_account' => 'abc', 'account_name' => ''])
            ->assertJsonValidationErrors(['bank_name', 'bank_account', 'account_name']);
        $this->submit(['reason' => 'other', 'description' => ''])->assertJsonValidationErrors('description');
        $this->submit(['reason' => 'broken'])->assertJsonValidationErrors('reason');
    }

    public function test_business_rejection_leaves_no_files_behind(): void
    {
        $this->order->update(['completed_at' => now()->subDays(30)]);

        $this->submit()->assertUnprocessable();

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_cannot_request_return_for_someone_elses_order(): void
    {
        $order = $this->completedOrder(now()->subDay(), User::factory()->create());

        $this->submit([], $order)->assertNotFound();
    }
}
