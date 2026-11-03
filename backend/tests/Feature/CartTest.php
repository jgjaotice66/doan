<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config(['shop.shipping_fee' => 30000]);
        $this->user = User::factory()->create();
    }

    private function asUser(?User $user = null): static
    {
        return $this->actingAs($user ?? $this->user, 'sanctum');
    }

    private function add(int $productId, int $quantity = 1): TestResponse
    {
        return $this->asUser()->postJson('/api/v1/cart', ['product_id' => $productId, 'quantity' => $quantity]);
    }

    public function test_guest_cannot_use_cart(): void
    {
        $this->getJson('/api/v1/cart')->assertUnauthorized();
        $this->postJson('/api/v1/cart', [])->assertUnauthorized();
    }

    public function test_empty_cart_has_zero_totals(): void
    {
        $this->asUser()->getJson('/api/v1/cart')
            ->assertOk()
            ->assertExactJson(['data' => [
                'items' => [],
                'count' => 0,
                'subtotal' => 0,
                'shipping_fee' => 0,
                'total' => 0,
                'has_unavailable' => false,
            ]]);
    }

    public function test_add_item_returns_cart_with_totals(): void
    {
        $product = Product::factory()->create(['price' => 100000, 'sale_price' => 80000, 'stock' => 10]);

        $this->add($product->id, 2)
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'items' => [['id', 'quantity', 'line_total', 'max_quantity', 'unavailable', 'unavailable_reason', 'product' => ['id', 'name', 'slug', 'final_price', 'thumbnail']]],
                'count', 'subtotal', 'shipping_fee', 'total', 'has_unavailable',
            ]])
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.line_total', 160000)
            ->assertJsonPath('data.items.0.max_quantity', 10)
            ->assertJsonPath('data.count', 2)
            ->assertJsonPath('data.subtotal', 160000)
            ->assertJsonPath('data.shipping_fee', 30000)
            ->assertJsonPath('data.total', 190000);

        $this->assertDatabaseHas('cart_items', ['user_id' => $this->user->id, 'product_id' => $product->id, 'quantity' => 2]);
    }

    public function test_adding_same_product_accumulates_quantity(): void
    {
        $product = Product::factory()->create(['stock' => 10]);

        $this->add($product->id, 2);
        $this->add($product->id, 3)
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.quantity', 5);

        $this->assertSame(1, CartItem::count());
    }

    public function test_cannot_add_more_than_stock_including_existing_quantity(): void
    {
        $product = Product::factory()->create(['stock' => 5]);

        $this->add($product->id, 6)->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        $this->add($product->id, 4)->assertOk();
        $this->add($product->id, 2)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity' => 'Chỉ còn 5 sản phẩm trong kho (giỏ của bạn đã có 4).']);

        $this->assertDatabaseHas('cart_items', ['product_id' => $product->id, 'quantity' => 4]);
    }

    public function test_cannot_add_hidden_deleted_or_missing_products(): void
    {
        $hidden = Product::factory()->hidden()->create();
        $deleted = Product::factory()->create();
        $deleted->delete();

        $this->add($hidden->id)->assertUnprocessable()->assertJsonValidationErrors(['product_id']);
        $this->add($deleted->id)->assertUnprocessable()->assertJsonValidationErrors(['product_id']);
        $this->add(999999)->assertUnprocessable()->assertJsonValidationErrors(['product_id']);
        $this->asUser()->postJson('/api/v1/cart', ['product_id' => $hidden->id, 'quantity' => 0])
            ->assertJsonValidationErrors(['quantity']);

        $this->assertSame(0, CartItem::count());
    }

    public function test_cannot_add_out_of_stock_product(): void
    {
        $product = Product::factory()->outOfStock()->create();

        $this->add($product->id)->assertUnprocessable()->assertJsonValidationErrors(['quantity']);
    }

    public function test_update_quantity_within_stock(): void
    {
        $product = Product::factory()->create(['price' => 50000, 'stock' => 5]);
        $item = CartItem::factory()->for($this->user)->for($product)->create(['quantity' => 1]);

        $this->asUser()->patchJson("/api/v1/cart/{$item->id}", ['quantity' => 5])
            ->assertOk()
            ->assertJsonPath('data.items.0.quantity', 5)
            ->assertJsonPath('data.subtotal', 250000);

        $this->asUser()->patchJson("/api/v1/cart/{$item->id}", ['quantity' => 6])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);

        $this->assertSame(5, $item->refresh()->quantity);
    }

    public function test_remove_item(): void
    {
        $item = CartItem::factory()->for($this->user)->create();

        $this->asUser()->deleteJson("/api/v1/cart/{$item->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data.items');

        $this->assertModelMissing($item);
    }

    public function test_cannot_touch_other_users_cart_items(): void
    {
        $other = User::factory()->create();
        $item = CartItem::factory()->for($other)->create(['quantity' => 1]);

        $this->asUser()->patchJson("/api/v1/cart/{$item->id}", ['quantity' => 2])->assertNotFound();
        $this->asUser()->deleteJson("/api/v1/cart/{$item->id}")->assertNotFound();

        $this->assertSame(1, $item->refresh()->quantity);
        $this->asUser()->getJson('/api/v1/cart')->assertJsonCount(0, 'data.items');
    }

    public function test_unavailable_items_are_flagged_and_excluded_from_totals(): void
    {
        $ok = Product::factory()->create(['price' => 100000, 'stock' => 10]);
        $hidden = Product::factory()->hidden()->create(['price' => 200000]);
        $soldOut = Product::factory()->create(['price' => 300000, 'stock' => 0]);
        $deleted = Product::factory()->create(['price' => 400000]);

        foreach ([$ok, $hidden, $soldOut, $deleted] as $product) {
            CartItem::factory()->for($this->user)->for($product)->create(['quantity' => 1]);
        }
        $deleted->delete();

        $response = $this->asUser()->getJson('/api/v1/cart')->assertOk();

        $items = collect($response->json('data.items'))->keyBy('product.id');
        $this->assertFalse($items[$ok->id]['unavailable']);
        $this->assertNull($items[$ok->id]['unavailable_reason']);
        $this->assertSame('Sản phẩm đã ngừng kinh doanh', $items[$hidden->id]['unavailable_reason']);
        $this->assertSame('Hết hàng', $items[$soldOut->id]['unavailable_reason']);
        $this->assertSame('Sản phẩm đã ngừng kinh doanh', $items[$deleted->id]['unavailable_reason']);

        $response->assertJsonPath('data.subtotal', 100000)
            ->assertJsonPath('data.total', 130000)
            ->assertJsonPath('data.count', 4)
            ->assertJsonPath('data.has_unavailable', true);
    }

    public function test_item_above_current_stock_is_flagged(): void
    {
        $product = Product::factory()->create(['price' => 100000, 'stock' => 2]);
        CartItem::factory()->for($this->user)->for($product)->create(['quantity' => 5]);

        $this->asUser()->getJson('/api/v1/cart')
            ->assertJsonPath('data.items.0.unavailable', true)
            ->assertJsonPath('data.items.0.unavailable_reason', 'Chỉ còn 2 sản phẩm')
            ->assertJsonPath('data.subtotal', 0)
            ->assertJsonPath('data.shipping_fee', 0);
    }
}
