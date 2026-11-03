<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\StockReason;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PlaceOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'shop.shipping_fee' => 30000,
            'shop.vietqr' => ['bank' => 'MB', 'account' => '0123456789', 'account_name' => 'TOY STORE'],
        ]);
        $this->user = User::factory()->create();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function place(array $overrides = [], ?User $user = null): TestResponse
    {
        return $this->actingAs($user ?? $this->user, 'sanctum')->postJson('/api/v1/orders', array_merge([
            'recipient_name' => 'Nguyễn Văn A',
            'phone' => '0901234567',
            'address' => '12 Lê Lợi, Quận 1, TP.HCM',
            'note' => 'Giao giờ hành chính',
            'payment_method' => 'cod',
        ], $overrides));
    }

    private function addToCart(Product $product, int $quantity): CartItem
    {
        return CartItem::factory()->for($this->user)->for($product)->create(['quantity' => $quantity]);
    }

    public function test_guest_cannot_place_order(): void
    {
        $this->postJson('/api/v1/orders', [])->assertUnauthorized();
    }

    public function test_validates_shipping_info_and_payment_method(): void
    {
        $this->place(['recipient_name' => '', 'phone' => '12345', 'address' => '', 'payment_method' => 'bitcoin'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['recipient_name', 'phone', 'address', 'payment_method']);
    }

    public function test_empty_cart_is_rejected(): void
    {
        $this->place()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cart' => 'Giỏ hàng đang trống.']);

        $this->assertSame(0, Order::count());
    }

    public function test_successful_cod_order_decreases_stock_and_clears_cart(): void
    {
        $gundam = Product::factory()->create(['name' => 'Gundam RX-78-2', 'price' => 300000, 'sale_price' => 250000, 'stock' => 10]);
        $lego = Product::factory()->create(['name' => 'LEGO Falcon', 'price' => 1000000, 'stock' => 3]);
        $this->addToCart($gundam, 2);
        $this->addToCart($lego, 3);

        $response = $this->place()->assertCreated();

        $code = $response->json('data.code');
        $this->assertMatchesRegularExpression('/^TS\d{6}[A-Z0-9]{4}$/', $code);
        $response
            ->assertJsonPath('data.status.value', 'pending')
            ->assertJsonPath('data.status.label', 'Chờ xác nhận')
            ->assertJsonPath('data.payment_method.value', 'cod')
            ->assertJsonPath('data.payment_status.value', 'unpaid')
            ->assertJsonPath('data.subtotal', 3500000)
            ->assertJsonPath('data.shipping_fee', 30000)
            ->assertJsonPath('data.total', 3530000)
            ->assertJsonPath('data.qr_url', null)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.product_name', 'Gundam RX-78-2')
            ->assertJsonPath('data.items.0.price', 250000)
            ->assertJsonPath('data.items.0.line_total', 500000);

        $order = Order::where('code', $code)->firstOrFail();
        $this->assertSame($this->user->id, $order->user_id);
        $this->assertSame(OrderStatus::Pending, $order->status);
        $this->assertSame(PaymentStatus::Unpaid, $order->payment_status);
        $this->assertSame('12 Lê Lợi, Quận 1, TP.HCM', $order->address);

        $this->assertSame(8, $gundam->refresh()->stock);
        $this->assertSame(0, $lego->refresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $gundam->id, 'change' => -2, 'reason' => StockReason::Order->value,
            'order_id' => $order->id, 'user_id' => $this->user->id,
        ]);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $lego->id, 'change' => -3, 'order_id' => $order->id]);

        $this->assertSame(0, $this->user->cartItems()->count());
    }

    public function test_insufficient_stock_creates_nothing_and_keeps_stock_and_cart(): void
    {
        $ok = Product::factory()->create(['stock' => 10]);
        $short = Product::factory()->create(['name' => 'Hot Toys Iron Man', 'stock' => 1]);
        $this->addToCart($ok, 2);
        $this->addToCart($short, 2);

        $this->place()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'Hot Toys Iron Man: Chỉ còn 1 sản phẩm']);

        $this->assertSame(0, Order::count());
        $this->assertDatabaseCount('order_items', 0);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertSame(10, $ok->refresh()->stock);
        $this->assertSame(1, $short->refresh()->stock);
        $this->assertSame(2, $this->user->cartItems()->count());
    }

    public function test_hidden_or_deleted_product_in_cart_blocks_order(): void
    {
        $hidden = Product::factory()->create(['name' => 'Sản phẩm ẩn', 'stock' => 5]);
        $deleted = Product::factory()->create(['name' => 'Sản phẩm xoá', 'stock' => 5]);
        $this->addToCart($hidden, 1);
        $this->addToCart($deleted, 1);
        $hidden->update(['status' => 'hidden']);
        $deleted->delete();

        $response = $this->place()->assertUnprocessable();

        $this->assertEqualsCanonicalizing([
            'Sản phẩm ẩn: Sản phẩm đã ngừng kinh doanh',
            'Sản phẩm xoá: Sản phẩm đã ngừng kinh doanh',
        ], $response->json('errors.items'));
        $this->assertSame(0, Order::count());
    }

    public function test_order_items_keep_price_and_name_snapshot(): void
    {
        $product = Product::factory()->create(['name' => 'Tên cũ', 'price' => 200000, 'stock' => 5]);
        $this->addToCart($product, 1);
        $code = $this->place()->json('data.code');

        $product->update(['name' => 'Tên mới', 'price' => 999000]);

        $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/orders/{$code}")
            ->assertOk()
            ->assertJsonPath('data.items.0.product_name', 'Tên cũ')
            ->assertJsonPath('data.items.0.price', 200000)
            ->assertJsonPath('data.total', 230000);
    }

    public function test_bank_qr_order_includes_vietqr_url_with_amount_and_code(): void
    {
        $product = Product::factory()->create(['price' => 450000, 'stock' => 5]);
        $this->addToCart($product, 2);

        $response = $this->place(['payment_method' => 'bank_qr'])->assertCreated();

        $code = $response->json('data.code');
        $url = $response->json('data.qr_url');
        $this->assertStringStartsWith('https://img.vietqr.io/image/MB-0123456789-compact2.png?', $url);
        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame('930000', $query['amount']);
        $this->assertSame($code, $query['addInfo']);
        $this->assertSame('TOY STORE', $query['accountName']);
        $response->assertJsonPath('data.bank.account', '0123456789');
    }

    public function test_user_lists_only_own_orders_newest_first(): void
    {
        $older = Order::factory()->for($this->user)->create(['created_at' => now()->subDay()]);
        $newer = Order::factory()->for($this->user)->create();
        Order::factory()->create();

        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.code', $newer->code)
            ->assertJsonPath('data.1.code', $older->code)
            ->assertJsonStructure(['meta' => ['current_page', 'last_page', 'total']]);
    }

    public function test_cannot_view_other_users_order(): void
    {
        $order = Order::factory()->create();

        $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/orders/{$order->code}")->assertNotFound();
        $this->actingAs($order->user, 'sanctum')->getJson("/api/v1/orders/{$order->code}")->assertOk();
    }
}
