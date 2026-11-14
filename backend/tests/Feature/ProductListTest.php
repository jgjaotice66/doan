<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ProductListTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $query
     */
    private function list(array $query = []): TestResponse
    {
        return $this->getJson('/api/v1/products?'.http_build_query($query))->assertOk();
    }

    /**
     * @return list<string>
     */
    private function slugs(TestResponse $response): array
    {
        return collect($response->json('data'))->pluck('slug')->all();
    }

    public function test_lists_only_active_products_with_card_fields(): void
    {
        $product = Product::factory()->create(['slug' => 'dang-ban', 'price' => 500000, 'sale_price' => 400000, 'stock' => 0]);
        ProductImage::factory()->create(['product_id' => $product->id, 'path' => 'https://img.test/2.png', 'sort_order' => 2]);
        ProductImage::factory()->create(['product_id' => $product->id, 'path' => 'https://img.test/1.png', 'sort_order' => 1]);
        Product::factory()->hidden()->create(['slug' => 'dang-an']);
        Product::factory()->create(['slug' => 'da-xoa'])->delete();

        $response = $this->list();

        $this->assertSame(['dang-ban'], $this->slugs($response));
        $response->assertJsonStructure([
            'data' => [['id', 'name', 'slug', 'price', 'sale_price', 'final_price', 'thumbnail', 'in_stock', 'min_age', 'brand' => ['id', 'name', 'slug']]],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            'links',
        ])
            ->assertJsonPath('data.0.final_price', 400000)
            ->assertJsonPath('data.0.thumbnail', 'https://img.test/1.png')
            ->assertJsonPath('data.0.in_stock', false)
            ->assertJsonPath('data.0.low_stock', false);
    }

    public function test_card_has_second_image_for_hover_when_available(): void
    {
        $two = Product::factory()->create(['slug' => 'hai-anh']);
        ProductImage::factory()->create(['product_id' => $two->id, 'path' => 'https://img.test/b.png', 'sort_order' => 2]);
        ProductImage::factory()->create(['product_id' => $two->id, 'path' => 'https://img.test/a.png', 'sort_order' => 1]);
        ProductImage::factory()->create(['product_id' => $two->id, 'path' => 'https://img.test/c.png', 'sort_order' => 3]);
        $one = Product::factory()->create(['slug' => 'mot-anh']);
        ProductImage::factory()->create(['product_id' => $one->id, 'path' => 'https://img.test/x.png', 'sort_order' => 1]);

        $cards = collect($this->list()->json('data'))->keyBy('slug');

        $this->assertSame('https://img.test/a.png', $cards['hai-anh']['thumbnail']);
        $this->assertSame('https://img.test/b.png', $cards['hai-anh']['hover_image']);
        $this->assertNull($cards['mot-anh']['hover_image']);
    }

    public function test_low_stock_flag_uses_configured_threshold(): void
    {
        config(['shop.low_stock_threshold' => 5]);
        Product::factory()->create(['slug' => 'sap-het', 'stock' => 5]);
        Product::factory()->create(['slug' => 'con-nhieu', 'stock' => 6]);
        Product::factory()->create(['slug' => 'het-hang', 'stock' => 0]);

        $flags = collect($this->list()->json('data'))->pluck('low_stock', 'slug');

        $this->assertTrue($flags['sap-het']);
        $this->assertFalse($flags['con-nhieu']);
        $this->assertFalse($flags['het-hang'], 'Hết hàng thì hiện "Hết hàng", không phải "Sắp hết"');
    }

    public function test_search_matches_name_or_sku(): void
    {
        Product::factory()->create(['slug' => 'theo-ten', 'name' => 'Gundam RX-78-2 Ver.Ka']);
        Product::factory()->create(['slug' => 'theo-sku', 'name' => 'Mô hình xe', 'sku' => 'GUNDAM-001']);
        Product::factory()->create(['slug' => 'khong-khop', 'name' => 'LEGO Technic', 'sku' => 'LEGO-001']);

        $slugs = $this->slugs($this->list(['q' => 'gundam']));

        $this->assertEqualsCanonicalizing(['theo-ten', 'theo-sku'], $slugs);
    }

    public function test_search_requires_every_word_but_not_adjacent(): void
    {
        Product::factory()->create(['slug' => 'du-tu', 'name' => 'Nendoroid Hatsune Miku']);
        Product::factory()->create(['slug' => 'thieu-tu', 'name' => 'Nendoroid Gojo Satoru']);

        $this->assertSame(['du-tu'], $this->slugs($this->list(['q' => 'miku  nendoroid'])));
    }

    public function test_category_filter_includes_child_categories(): void
    {
        $parent = Category::factory()->create(['slug' => 'mo-hinh']);
        $child = Category::factory()->create(['slug' => 'gundam', 'parent_id' => $parent->id]);
        $other = Category::factory()->create(['slug' => 'lego']);

        Product::factory()->create(['slug' => 'cha', 'category_id' => $parent->id]);
        Product::factory()->create(['slug' => 'con', 'category_id' => $child->id]);
        Product::factory()->create(['slug' => 'khac', 'category_id' => $other->id]);

        $this->assertEqualsCanonicalizing(['cha', 'con'], $this->slugs($this->list(['category' => 'mo-hinh'])));
        $this->assertSame(['con'], $this->slugs($this->list(['category' => 'gundam'])));
        $this->assertSame([], $this->slugs($this->list(['category' => 'khong-ton-tai'])));
    }

    public function test_brand_filter_accepts_multiple_slugs(): void
    {
        foreach (['bandai', 'tamiya', 'lego'] as $slug) {
            Product::factory()->create([
                'slug' => "sp-{$slug}",
                'brand_id' => Brand::factory()->create(['slug' => $slug])->id,
            ]);
        }

        $this->assertEqualsCanonicalizing(['sp-bandai', 'sp-tamiya'], $this->slugs($this->list(['brand' => 'bandai,tamiya'])));
        $this->assertSame(['sp-lego'], $this->slugs($this->list(['brand' => 'lego'])));
    }

    public function test_min_age_filter_matches_age_group(): void
    {
        Product::factory()->create(['slug' => 'tuoi-8', 'min_age' => 8]);
        Product::factory()->create(['slug' => 'tuoi-14', 'min_age' => 14]);

        $this->assertSame(['tuoi-14'], $this->slugs($this->list(['min_age' => 14])));
        $this->getJson('/api/v1/products?min_age=7')->assertUnprocessable()->assertJsonValidationErrors(['min_age']);
    }

    public function test_price_range_uses_final_price(): void
    {
        Product::factory()->create(['slug' => 'giam-gia-vao-khoang', 'price' => 500000, 'sale_price' => 200000]);
        Product::factory()->create(['slug' => 'gia-goc-vao-khoang', 'price' => 250000]);
        Product::factory()->create(['slug' => 'qua-dat', 'price' => 400000]);
        Product::factory()->create(['slug' => 'qua-re', 'price' => 50000]);

        $slugs = $this->slugs($this->list(['price_min' => 100000, 'price_max' => 300000]));

        $this->assertEqualsCanonicalizing(['giam-gia-vao-khoang', 'gia-goc-vao-khoang'], $slugs);
    }

    public function test_featured_filter(): void
    {
        Product::factory()->featured()->create(['slug' => 'noi-bat']);
        Product::factory()->create(['slug' => 'thuong']);

        $this->assertSame(['noi-bat'], $this->slugs($this->list(['featured' => 1])));
    }

    public function test_filters_can_be_combined(): void
    {
        $bandai = Brand::factory()->create(['slug' => 'bandai']);
        $gundam = Category::factory()->create(['slug' => 'gundam']);

        Product::factory()->create(['slug' => 'khop-het', 'brand_id' => $bandai->id, 'category_id' => $gundam->id, 'min_age' => 14, 'price' => 300000]);
        Product::factory()->create(['slug' => 'sai-tuoi', 'brand_id' => $bandai->id, 'category_id' => $gundam->id, 'min_age' => 8, 'price' => 300000]);
        Product::factory()->create(['slug' => 'sai-gia', 'brand_id' => $bandai->id, 'category_id' => $gundam->id, 'min_age' => 14, 'price' => 900000]);
        Product::factory()->create(['slug' => 'sai-hang', 'category_id' => $gundam->id, 'min_age' => 14, 'price' => 300000]);

        $slugs = $this->slugs($this->list([
            'category' => 'gundam',
            'brand' => 'bandai',
            'min_age' => 14,
            'price_max' => 500000,
        ]));

        $this->assertSame(['khop-het'], $slugs);
    }

    public function test_sort_by_final_price(): void
    {
        Product::factory()->create(['slug' => 'b', 'price' => 300000]);
        Product::factory()->create(['slug' => 'a', 'price' => 900000, 'sale_price' => 100000]);
        Product::factory()->create(['slug' => 'c', 'price' => 500000]);

        $this->assertSame(['a', 'b', 'c'], $this->slugs($this->list(['sort' => 'price_asc'])));
        $this->assertSame(['c', 'b', 'a'], $this->slugs($this->list(['sort' => 'price_desc'])));
    }

    public function test_default_sort_is_newest_first(): void
    {
        Product::factory()->create(['slug' => 'cu', 'created_at' => now()->subDays(2)]);
        Product::factory()->create(['slug' => 'moi', 'created_at' => now()]);

        $this->assertSame(['moi', 'cu'], $this->slugs($this->list()));
    }

    public function test_sort_best_selling_ignores_cancelled_orders(): void
    {
        $ban_it = Product::factory()->create(['slug' => 'ban-it']);
        $ban_chay = Product::factory()->create(['slug' => 'ban-chay']);
        Product::factory()->create(['slug' => 'chua-ban']);

        OrderItem::factory()->create(['product_id' => $ban_chay->id, 'quantity' => 5]);
        OrderItem::factory()->create(['product_id' => $ban_it->id, 'quantity' => 2]);
        OrderItem::factory()->create([
            'product_id' => $ban_it->id,
            'quantity' => 10,
            'order_id' => Order::factory()->status(OrderStatus::Cancelled),
        ]);

        $this->assertSame(['ban-chay', 'ban-it', 'chua-ban'], $this->slugs($this->list(['sort' => 'best_selling'])));
    }

    public function test_pagination_and_per_page_cap(): void
    {
        Product::factory()->count(50)->create();

        $this->list()->assertJsonPath('meta.per_page', 12)->assertJsonCount(12, 'data');
        $this->list(['per_page' => 100])->assertJsonPath('meta.per_page', 48)->assertJsonCount(48, 'data');
        $this->list(['per_page' => 48, 'page' => 2])->assertJsonPath('meta.current_page', 2)->assertJsonCount(2, 'data');
    }

    public function test_invalid_sort_is_rejected(): void
    {
        $this->getJson('/api/v1/products?sort=random')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort']);
    }

    public function test_list_avoids_n_plus_one_queries(): void
    {
        Product::factory()->count(10)->has(ProductImage::factory()->count(2), 'images')->create();

        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });

        $this->list();

        // Đếm + sản phẩm + brand + ảnh + danh mục (ngưỡng sắp hết) + cài đặt chung — cố định, không tăng theo số sản phẩm.
        $this->assertLessThanOrEqual(6, $queries);
    }
}
