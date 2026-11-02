<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\UserRole;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DomainModelsTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(array $overrides = []): Product
    {
        $parent = Category::create(['name' => 'Mô hình', 'slug' => 'mo-hinh']);
        $category = Category::create(['name' => 'Gundam', 'slug' => 'gundam', 'parent_id' => $parent->id]);
        $brand = Brand::create(['name' => 'Bandai', 'slug' => 'bandai']);

        return Product::create(array_merge([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'RX-78-2',
            'slug' => 'rx-78-2',
            'sku' => 'BD-001',
            'price' => 500000,
            'stock' => 10,
            'min_age' => 8,
        ], $overrides));
    }

    public function test_new_user_defaults_to_active_customer(): void
    {
        $user = User::factory()->create()->refresh();

        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue($user->is_active);
        $this->assertFalse($user->isAdmin());
    }

    public function test_final_price_prefers_sale_price(): void
    {
        $product = $this->makeProduct();
        $this->assertSame(500000, $product->final_price);

        $product->update(['sale_price' => 450000]);
        $this->assertSame(450000, $product->final_price);
    }

    public function test_product_relations_and_status_cast(): void
    {
        $product = $this->makeProduct()->refresh();
        $product->images()->create(['path' => 'b.jpg', 'sort_order' => 2]);
        $product->images()->create(['path' => 'a.jpg', 'sort_order' => 1]);

        $this->assertSame(ProductStatus::Active, $product->status);
        $this->assertSame('Bandai', $product->brand->name);
        $this->assertSame('Mô hình', $product->category->parent->name);
        $this->assertSame(['a.jpg', 'b.jpg'], $product->images->pluck('path')->all());
        $this->assertCount(1, Product::active()->get());
    }

    public function test_order_and_wishlist_relations(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct();

        $order = Order::create([
            'code' => 'TS0001',
            'user_id' => $user->id,
            'recipient_name' => 'A',
            'phone' => '0900000000',
            'address' => 'HCM',
            'subtotal' => 500000,
            'shipping_fee' => 30000,
            'total' => 530000,
            'payment_method' => PaymentMethod::BankQr,
        ])->refresh();
        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 500000,
            'quantity' => 2,
        ]);
        $user->wishlist()->attach($product);

        $this->assertSame(OrderStatus::Pending, $order->status);
        $this->assertSame(PaymentStatus::Unpaid, $order->payment_status);
        $this->assertSame(1000000, $order->items->first()->line_total);
        $this->assertTrue($user->orders->first()->is($order));
        $this->assertTrue($user->wishlist->first()->is($product));
    }
}
