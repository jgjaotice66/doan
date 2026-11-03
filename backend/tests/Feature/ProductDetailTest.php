<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_shows_full_product_detail_by_slug(): void
    {
        $product = Product::factory()->create([
            'slug' => 'rx-78-2',
            'sku' => 'BAN-001',
            'description' => 'Mô tả chi tiết',
            'price' => 500000,
            'sale_price' => 450000,
            'stock' => 7,
            'min_age' => 14,
        ]);
        ProductImage::factory()->create(['product_id' => $product->id, 'path' => 'https://img.test/b.png', 'sort_order' => 2]);
        ProductImage::factory()->create(['product_id' => $product->id, 'path' => 'products/a.png', 'sort_order' => 1]);

        $this->getJson('/api/v1/products/rx-78-2')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'id', 'name', 'slug', 'sku', 'description', 'price', 'sale_price', 'final_price',
                'stock', 'in_stock', 'min_age', 'thumbnail', 'is_wishlisted',
                'images' => [['id', 'url']],
                'category' => ['id', 'name', 'slug'],
                'brand' => ['id', 'name', 'slug'],
                'related',
            ]])
            ->assertJsonPath('data.sku', 'BAN-001')
            ->assertJsonPath('data.stock', 7)
            ->assertJsonPath('data.final_price', 450000)
            ->assertJsonPath('data.images.0.url', config('app.url').'/storage/products/a.png')
            ->assertJsonPath('data.images.1.url', 'https://img.test/b.png')
            ->assertJsonPath('data.thumbnail', config('app.url').'/storage/products/a.png')
            ->assertJsonPath('data.is_wishlisted', false);
    }

    public function test_unknown_hidden_or_deleted_products_return_404(): void
    {
        Product::factory()->hidden()->create(['slug' => 'dang-an']);
        Product::factory()->create(['slug' => 'da-xoa'])->delete();

        $this->getJson('/api/v1/products/khong-ton-tai')->assertNotFound();
        $this->getJson('/api/v1/products/dang-an')->assertNotFound();
        $this->getJson('/api/v1/products/da-xoa')->assertNotFound();
    }

    public function test_related_products_share_category_and_exclude_itself(): void
    {
        $category = Category::factory()->create();
        $product = Product::factory()->create(['slug' => 'chinh-no', 'category_id' => $category->id]);
        Product::factory()->count(10)->create(['category_id' => $category->id]);
        Product::factory()->hidden()->create(['slug' => 'cung-loai-bi-an', 'category_id' => $category->id]);
        Product::factory()->create(['slug' => 'khac-loai']);

        $related = collect($this->getJson('/api/v1/products/chinh-no')->json('data.related'));

        $this->assertCount(8, $related);
        $this->assertNotContains('chinh-no', $related->pluck('slug'));
        $this->assertNotContains('cung-loai-bi-an', $related->pluck('slug'));
        $this->assertNotContains('khac-loai', $related->pluck('slug'));
        $this->assertArrayHasKey('thumbnail', $related->first());
    }

    public function test_is_wishlisted_reflects_logged_in_user(): void
    {
        $product = Product::factory()->create(['slug' => 'yeu-thich']);
        $user = User::factory()->create();
        $user->wishlist()->attach($product);
        $other = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson('/api/v1/products/yeu-thich')
            ->assertJsonPath('data.is_wishlisted', true);

        $this->app['auth']->forgetGuards();

        $this->withToken($other->createToken('t')->plainTextToken)
            ->getJson('/api/v1/products/yeu-thich')
            ->assertJsonPath('data.is_wishlisted', false);
    }
}
