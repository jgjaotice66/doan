<?php

namespace Tests\Feature\Admin;

use App\Enums\StockReason;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        config(['shop.low_stock_threshold' => 5]);
        $this->admin = Sanctum::actingAs(User::factory()->admin()->create(['name' => 'Quản Lý Kho']));
    }

    // ---------- Tồn kho ----------

    public function test_lists_products_with_lowest_stock_first_and_a_low_stock_summary(): void
    {
        $plenty = Product::factory()->create(['stock' => 40]);
        $out = Product::factory()->create(['stock' => 0]);
        $low = Product::factory()->create(['stock' => 3]);
        Product::factory()->create(['stock' => 1])->delete();

        $response = $this->getJson('/api/v1/admin/inventory')->assertOk();

        $this->assertSame([$out->id, $low->id, $plenty->id], array_column($response->json('data'), 'id'));
        $response
            ->assertJsonPath('data.1.low_stock', true)
            ->assertJsonPath('summary', ['low_stock' => 2, 'out_of_stock' => 1, 'threshold' => 5]);
    }

    public function test_filters_low_stock_and_searches_name_or_sku(): void
    {
        $low = Product::factory()->create(['stock' => 5, 'name' => 'Gundam RX-78', 'sku' => 'GD-001']);
        Product::factory()->create(['stock' => 6, 'name' => 'Gundam Zaku', 'sku' => 'GD-002']);

        $this->getJson('/api/v1/admin/inventory?low_stock=1')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $low->id);
        $this->getJson('/api/v1/admin/inventory?q=GD-00')->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/admin/inventory?q=zaku')->assertJsonCount(1, 'data');
    }

    public function test_stock_list_can_be_sorted(): void
    {
        $b = Product::factory()->create(['name' => 'Bandai Zaku', 'stock' => 9, 'created_at' => now()->subDays(2)]);
        $a = Product::factory()->create(['name' => 'Alpha Figure', 'stock' => 30, 'created_at' => now()->subDay()]);
        $c = Product::factory()->create(['name' => 'Chibi Maruko', 'stock' => 2, 'created_at' => now()]);

        $ids = fn (string $sort) => array_column($this->getJson("/api/v1/admin/inventory?sort={$sort}")->assertOk()->json('data'), 'id');

        $this->assertSame([$c->id, $b->id, $a->id], $ids('stock_asc'));
        $this->assertSame([$a->id, $b->id, $c->id], $ids('stock_desc'));
        $this->assertSame([$a->id, $b->id, $c->id], $ids('name'));
        $this->assertSame([$c->id, $a->id, $b->id], $ids('newest'));
        $this->getJson('/api/v1/admin/inventory?sort=price')->assertJsonValidationErrors('sort');
    }

    // ---------- Nhập / điều chỉnh ----------

    public function test_import_adds_stock_and_records_movement(): void
    {
        $product = Product::factory()->create(['stock' => 4]);

        $this->postJson("/api/v1/admin/inventory/{$product->id}/adjust", [
            'type' => 'import',
            'quantity' => 10,
            'note' => 'Lô hàng tháng 11',
        ])
            ->assertCreated()
            ->assertJsonPath('data.product.stock', 14)
            ->assertJsonPath('data.movement.change', 10)
            ->assertJsonPath('data.movement.reason.value', 'import')
            ->assertJsonPath('data.movement.user.name', 'Quản Lý Kho');

        $this->assertSame(14, $product->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'change' => 10,
            'reason' => StockReason::Import->value,
            'user_id' => $this->admin->id,
            'note' => 'Lô hàng tháng 11',
        ]);
    }

    public function test_adjust_can_decrease_stock_with_a_reason(): void
    {
        $product = Product::factory()->create(['stock' => 4]);

        $this->postJson("/api/v1/admin/inventory/{$product->id}/adjust", [
            'type' => 'adjust',
            'quantity' => -3,
            'note' => 'Kiểm kê: 3 hộp móp',
        ])
            ->assertCreated()
            ->assertJsonPath('data.product.stock', 1)
            ->assertJsonPath('data.product.low_stock', true)
            ->assertJsonPath('data.movement.reason.value', 'adjust');

        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'change' => -3, 'reason' => 'adjust']);
    }

    public function test_adjust_that_would_make_stock_negative_returns_422(): void
    {
        $product = Product::factory()->create(['stock' => 4]);

        $this->postJson("/api/v1/admin/inventory/{$product->id}/adjust", [
            'type' => 'adjust',
            'quantity' => -5,
            'note' => 'Kiểm kê',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Tồn kho hiện có 4, không thể giảm 5.']);

        $this->assertSame(4, $product->fresh()->stock);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_validation_rules(): void
    {
        $product = Product::factory()->create(['stock' => 4]);
        $url = "/api/v1/admin/inventory/{$product->id}/adjust";

        $this->postJson($url, ['type' => 'sell', 'quantity' => 1])->assertJsonValidationErrors('type');
        $this->postJson($url, ['type' => 'import', 'quantity' => -2])->assertJsonValidationErrors('quantity');
        $this->postJson($url, ['type' => 'import', 'quantity' => 0])->assertJsonValidationErrors('quantity');
        $this->postJson($url, ['type' => 'import', 'quantity' => 1.5])->assertJsonValidationErrors('quantity');
        $this->postJson($url, ['type' => 'adjust', 'quantity' => 0, 'note' => 'x'])->assertJsonValidationErrors('quantity');
        $this->postJson($url, ['type' => 'adjust', 'quantity' => -1])
            ->assertJsonValidationErrors(['note' => 'Vui lòng ghi lý do điều chỉnh.']);

        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_cannot_adjust_deleted_product(): void
    {
        $product = Product::factory()->create(['stock' => 4]);
        $product->delete();

        $this->postJson("/api/v1/admin/inventory/{$product->id}/adjust", ['type' => 'import', 'quantity' => 1])
            ->assertNotFound();
    }

    // ---------- Lịch sử ----------

    public function test_movements_newest_first_with_product_order_and_user(): void
    {
        $product = Product::factory()->create(['name' => 'LEGO Castle', 'sku' => 'LG-01']);
        $order = Order::factory()->create(['code' => 'TS261107ABCD']);
        $old = StockMovement::factory()->for($product)->create(['created_at' => now()->subDay()]);
        $new = StockMovement::factory()->for($product)->create([
            'change' => -2, 'reason' => StockReason::Order, 'order_id' => $order->id, 'user_id' => $this->admin->id,
        ]);
        $product->delete(); // sản phẩm đã xoá vẫn hiện trong lịch sử

        $this->getJson('/api/v1/admin/inventory/movements')
            ->assertOk()
            ->assertJsonPath('data.0.id', $new->id)
            ->assertJsonPath('data.0.change', -2)
            ->assertJsonPath('data.0.reason', ['value' => 'order', 'label' => 'Bán hàng'])
            ->assertJsonPath('data.0.product.name', 'LEGO Castle')
            ->assertJsonPath('data.0.order', ['id' => $order->id, 'code' => 'TS261107ABCD'])
            ->assertJsonPath('data.0.user.name', 'Quản Lý Kho')
            ->assertJsonPath('data.1.id', $old->id)
            ->assertJsonPath('data.1.order', null);
    }

    public function test_movements_filter_by_product_reason_and_dates(): void
    {
        $a = Product::factory()->create();
        $b = Product::factory()->create();
        $target = StockMovement::factory()->for($a)->create(['reason' => StockReason::Adjust, 'change' => -1, 'created_at' => '2026-11-03 10:00:00']);
        StockMovement::factory()->for($a)->create(['reason' => StockReason::Import, 'created_at' => '2026-11-03 11:00:00']);
        StockMovement::factory()->for($b)->create(['reason' => StockReason::Adjust, 'change' => -1, 'created_at' => '2026-11-03 12:00:00']);
        StockMovement::factory()->for($a)->create(['reason' => StockReason::Adjust, 'change' => -1, 'created_at' => '2026-11-05 10:00:00']);

        $this->getJson("/api/v1/admin/inventory/movements?product={$a->id}&reason=adjust&from=2026-11-03&to=2026-11-04")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);

        $this->getJson('/api/v1/admin/inventory/movements?reason=lost')->assertJsonValidationErrors('reason');

        // Cũ nhất trước.
        $this->getJson("/api/v1/admin/inventory/movements?product={$a->id}&sort=oldest")
            ->assertJsonPath('data.0.id', $target->id);
        $this->getJson('/api/v1/admin/inventory/movements?sort=random')->assertJsonValidationErrors('sort');
    }

    public function test_customer_gets_403(): void
    {
        $product = Product::factory()->create(['stock' => 4]);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/inventory')->assertForbidden();
        $this->getJson('/api/v1/admin/inventory/movements')->assertForbidden();
        $this->postJson("/api/v1/admin/inventory/{$product->id}/adjust", ['type' => 'import', 'quantity' => 5])->assertForbidden();
        $this->assertSame(4, $product->fresh()->stock);
    }
}
