<?php

namespace Tests\Feature\Admin;

use App\Enums\ProductStatus;
use App\Enums\StockReason;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Category $category;

    private Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->admin = User::factory()->admin()->create();
        $this->category = Category::factory()->create();
        $this->brand = Brand::factory()->create();
        Sanctum::actingAs($this->admin);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'name' => 'Mô hình RX-78-2 Gundam',
            'sku' => 'GD-RX78',
            'description' => 'Mô hình lắp ráp tỉ lệ 1/144.',
            'price' => 450000,
            'sale_price' => 399000,
            'stock' => 12,
            'min_age' => 8,
            'is_featured' => true,
            'status' => 'active',
            ...$overrides,
        ];
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function adminEndpoints(): array
    {
        return [
            'index' => ['get', '/api/v1/admin/products'],
            'store' => ['post', '/api/v1/admin/products'],
            'update' => ['put', '/api/v1/admin/products/1'],
            'upload images' => ['post', '/api/v1/admin/products/1/images'],
            'reorder images' => ['put', '/api/v1/admin/products/1/images/order'],
            'delete image' => ['delete', '/api/v1/admin/product-images/1'],
            'content image' => ['post', '/api/v1/admin/products/content-images'],
        ];
    }

    #[DataProvider('adminEndpoints')]
    public function test_customer_gets_403(string $method, string $uri): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->json($method, $uri)->assertForbidden();
    }

    // ---------- Danh sách ----------

    public function test_index_includes_hidden_products_and_filters(): void
    {
        $child = Category::factory()->create(['parent_id' => $this->category->id]);
        $hidden = Product::factory()->for($this->category)->for($this->brand)->create(['status' => ProductStatus::Hidden, 'sku' => 'HID-001', 'stock' => 50]);
        $low = Product::factory()->for($child)->create(['stock' => 2]);
        Product::factory()->create(['stock' => 40]);
        Product::factory()->create(['stock' => 30])->delete(); // đã xoá → không hiện

        $this->getJson('/api/v1/admin/products')->assertOk()->assertJsonPath('meta.total', 3);

        $this->getJson('/api/v1/admin/products?status=hidden')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $hidden->id)
            ->assertJsonPath('data.0.status.value', 'hidden');

        $this->getJson('/api/v1/admin/products?q=hid-0')->assertJsonCount(1, 'data')->assertJsonPath('data.0.sku', 'HID-001');
        $this->getJson("/api/v1/admin/products?brand={$this->brand->id}")->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/products?low_stock=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $low->id);

        // Lọc danh mục gốc → gồm cả sản phẩm của danh mục con.
        $this->getJson("/api/v1/admin/products?category={$this->category->id}")->assertJsonPath('meta.total', 2);
    }

    public function test_index_rejects_invalid_filters(): void
    {
        $this->getJson('/api/v1/admin/products?status=deleted&sort=random')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'sort']);
    }

    // ---------- Tạo ----------

    public function test_store_creates_product_records_initial_stock_and_images(): void
    {
        $response = $this->post('/api/v1/admin/products', $this->payload([
            'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.png')],
        ]), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'mo-hinh-rx-78-2-gundam')
            ->assertJsonPath('data.stock', 12)
            ->assertJsonPath('data.status.value', 'active')
            ->assertJsonPath('data.category.id', $this->category->id)
            ->assertJsonCount(2, 'data.images');

        $product = Product::findOrFail($response->json('data.id'));

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'change' => 12,
            'reason' => StockReason::Import->value,
            'user_id' => $this->admin->id,
        ]);

        $this->assertSame([0, 1], $product->images->pluck('sort_order')->all());
        $product->images->each(fn (ProductImage $image) => Storage::disk('public')->assertExists($image->path));
    }

    public function test_store_with_zero_stock_records_no_movement(): void
    {
        $this->postJson('/api/v1/admin/products', $this->payload(['stock' => 0]))->assertCreated();

        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_sale_price_must_be_lower_than_price(): void
    {
        $this->postJson('/api/v1/admin/products', $this->payload(['price' => 300000, 'sale_price' => 300000]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sale_price' => 'Giá khuyến mãi phải nhỏ hơn giá gốc.']);

        $this->assertDatabaseCount('products', 0);
    }

    /**
     * @return array<string, array{array<string, mixed>, string}>
     */
    public static function invalidPayloads(): array
    {
        return [
            'tuổi ngoài tập cho phép' => [['min_age' => 5], 'min_age'],
            'thiếu danh mục' => [['category_id' => null], 'category_id'],
            'thương hiệu không tồn tại' => [['brand_id' => 9999], 'brand_id'],
            'trạng thái sai' => [['status' => 'draft'], 'status'],
            'giá âm' => [['price' => -1], 'price'],
            'tồn kho âm' => [['stock' => -3], 'stock'],
            'sku có dấu cách' => [['sku' => 'GD RX'], 'sku'],
        ];
    }

    #[DataProvider('invalidPayloads')]
    public function test_store_validation(array $overrides, string $field): void
    {
        $this->postJson('/api/v1/admin/products', $this->payload($overrides))
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    }

    public function test_sku_must_be_unique_including_deleted_products(): void
    {
        Product::factory()->create(['sku' => 'GD-RX78'])->delete();

        $this->postJson('/api/v1/admin/products', $this->payload(['sku' => 'gd-rx78']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sku');
    }

    // ---------- Sửa / xem / xoá ----------

    public function test_update_changes_fields_but_not_stock(): void
    {
        $product = Product::factory()->for($this->category)->for($this->brand)->create(['sku' => 'GD-RX78', 'stock' => 7]);

        $this->putJson("/api/v1/admin/products/{$product->id}", $this->payload(['stock' => 99]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('stock');

        $payload = $this->payload(['name' => 'Zaku II', 'sale_price' => null, 'status' => 'hidden']);
        unset($payload['stock']);

        $this->putJson("/api/v1/admin/products/{$product->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.name', 'Zaku II')
            ->assertJsonPath('data.slug', 'zaku-ii')
            ->assertJsonPath('data.sale_price', null)
            ->assertJsonPath('data.status.value', 'hidden')
            ->assertJsonPath('data.stock', 7);
    }

    public function test_show_returns_images_in_order(): void
    {
        $product = Product::factory()->create();
        $second = ProductImage::factory()->for($product)->create(['sort_order' => 1]);
        $first = ProductImage::factory()->for($product)->create(['sort_order' => 0]);

        $this->getJson("/api/v1/admin/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.images.0.id', $first->id)
            ->assertJsonPath('data.images.1.id', $second->id);
    }

    public function test_destroy_soft_deletes_and_hides_from_store(): void
    {
        $product = Product::factory()->create();

        $this->deleteJson("/api/v1/admin/products/{$product->id}")->assertNoContent();

        $this->assertSoftDeleted($product);
        $this->getJson("/api/v1/products/{$product->slug}")->assertNotFound();
    }

    // ---------- Ảnh ----------

    public function test_upload_images_appends_after_existing(): void
    {
        $product = Product::factory()->create();
        ProductImage::factory()->for($product)->create(['sort_order' => 0]);

        $this->post("/api/v1/admin/products/{$product->id}/images", [
            'images' => [UploadedFile::fake()->image('1.jpg'), UploadedFile::fake()->image('2.webp')],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonCount(3, 'data');

        $this->assertSame([0, 1, 2], $product->images()->pluck('sort_order')->all());
        $product->images->skip(1)->each(fn (ProductImage $image) => Storage::disk('public')->assertExists($image->path));
    }

    public function test_upload_rejects_more_than_ten_images_total(): void
    {
        $product = Product::factory()->create();
        ProductImage::factory()->count(9)->for($product)->create();

        $this->post("/api/v1/admin/products/{$product->id}/images", [
            'images' => [UploadedFile::fake()->image('1.jpg'), UploadedFile::fake()->image('2.jpg')],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['images' => 'tối đa 10 ảnh']);

        $this->assertSame([], Storage::disk('public')->allFiles('products'));
    }

    public function test_upload_rejects_non_image(): void
    {
        $product = Product::factory()->create();

        $this->post("/api/v1/admin/products/{$product->id}/images", [
            'images' => [UploadedFile::fake()->create('virus.exe', 10)],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('images.0');
    }

    public function test_delete_image_removes_row_and_file(): void
    {
        $product = Product::factory()->create();
        Storage::disk('public')->put('products/x.jpg', 'x');
        $image = ProductImage::factory()->for($product)->create(['path' => 'products/x.jpg']);

        $this->deleteJson("/api/v1/admin/product-images/{$image->id}")->assertNoContent();

        $this->assertModelMissing($image);
        Storage::disk('public')->assertMissing('products/x.jpg');
    }

    public function test_reorder_images(): void
    {
        $product = Product::factory()->create();
        [$a, $b, $c] = ProductImage::factory()->count(3)->for($product)->sequence(
            ['sort_order' => 0], ['sort_order' => 1], ['sort_order' => 2],
        )->create();

        $this->putJson("/api/v1/admin/products/{$product->id}/images/order", ['ids' => [$c->id, $a->id, $b->id]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $c->id)
            ->assertJsonPath('data.2.id', $b->id);

        $this->assertSame([$c->id, $a->id, $b->id], $product->images()->pluck('id')->all());
    }

    public function test_reorder_requires_exactly_the_products_images(): void
    {
        $product = Product::factory()->create();
        $mine = ProductImage::factory()->for($product)->create();
        $other = ProductImage::factory()->create();

        $this->putJson("/api/v1/admin/products/{$product->id}/images/order", ['ids' => [$mine->id, $other->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ids');

        $this->putJson("/api/v1/admin/products/{$product->id}/images/order", ['ids' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ids');
    }

    // ── Cảnh báo tồn kho ──────────────────────────────────────────

    public function test_stock_filter_separates_out_of_stock_from_low_stock(): void
    {
        config(['shop.low_stock_threshold' => 5]);
        $out = Product::factory()->create(['stock' => 0]);
        $low = Product::factory()->create(['stock' => 3]);
        Product::factory()->create(['stock' => 50]);

        $this->getJson('/api/v1/admin/products?stock=out')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $out->id);
        $this->getJson('/api/v1/admin/products?stock=low')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $low->id);
        $this->getJson('/api/v1/admin/products?stock=abc')->assertUnprocessable()->assertJsonValidationErrors('stock');
    }

    public function test_list_meta_counts_stock_alerts_regardless_of_filters(): void
    {
        config(['shop.low_stock_threshold' => 5]);
        Product::factory()->count(2)->create(['stock' => 0]);
        Product::factory()->create(['stock' => 3]);
        Product::factory()->create(['stock' => 0])->delete(); // đã xoá → không tính

        $this->getJson('/api/v1/admin/products?status=hidden')
            ->assertOk()
            ->assertJsonPath('meta.stock_alerts', ['out_of_stock' => 2, 'low_stock' => 1]);
    }

    // ── Mô tả dạng HTML (trình soạn thảo) ────────────────────────

    public function test_description_html_is_sanitized_and_keeps_images(): void
    {
        $html = '<h2>Điểm nổi bật</h2><p onclick="steal()">Khớp <strong>linh hoạt</strong></p>'
            .'<script>alert(1)</script><p><img src="http://localhost/storage/products/content/a.png" alt=""></p>';

        $description = $this->postJson('/api/v1/admin/products', $this->payload(['description' => $html]))
            ->assertCreated()
            ->json('data.description');

        $this->assertStringContainsString('<h2>Điểm nổi bật</h2>', $description);
        $this->assertStringContainsString('<strong>linh hoạt</strong>', $description);
        $this->assertStringContainsString('<img src="http://localhost/storage/products/content/a.png"', $description);
        $this->assertStringNotContainsString('script', $description);
        $this->assertStringNotContainsString('onclick', $description);
    }

    public function test_editor_non_breaking_spaces_become_normal_spaces(): void
    {
        // Quill 2 (getSemanticHTML) ghi mọi dấu cách thành &nbsp; → trình duyệt không xuống dòng được giữa các từ.
        $description = $this->postJson('/api/v1/admin/products', $this->payload(['description' => "<p>Khớp&nbsp;cử&nbsp;động\u{00A0}linh hoạt</p>"]))
            ->assertCreated()
            ->json('data.description');

        $this->assertSame('<p>Khớp cử động linh hoạt</p>', $description);
    }

    public function test_plain_text_description_becomes_paragraphs(): void
    {
        $description = $this->postJson('/api/v1/admin/products', $this->payload(['description' => "Dòng 1\nDòng 2\n\nĐoạn <2>"]))
            ->assertCreated()
            ->json('data.description');

        $this->assertSame('<p>Dòng 1<br>Dòng 2</p><p>Đoạn &lt;2&gt;</p>', $description);
    }

    public function test_empty_editor_content_is_saved_as_null(): void
    {
        $this->postJson('/api/v1/admin/products', $this->payload(['description' => '<p><br></p>']))
            ->assertCreated()
            ->assertJsonPath('data.description', null);
    }

    public function test_upload_description_image_returns_url(): void
    {
        $url = $this->post('/api/v1/admin/products/content-images', ['image' => UploadedFile::fake()->image('in.png')], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('url');

        $this->assertStringContainsString('/storage/products/content/', $url);
        Storage::disk('public')->assertExists('products/content/'.basename($url));

        $this->post('/api/v1/admin/products/content-images', ['image' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors('image');
    }

    public function test_images_removed_from_description_are_deleted(): void
    {
        $keep = UploadedFile::fake()->image('keep.png')->store('products/content', 'public');
        $drop = UploadedFile::fake()->image('drop.png')->store('products/content', 'public');
        $product = Product::factory()->create([
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'description' => '<p><img src="http://localhost/storage/'.$keep.'"><img src="http://localhost/storage/'.$drop.'"></p>',
        ]);

        $this->putJson("/api/v1/admin/products/{$product->id}", Arr::except($this->payload([
            'name' => $product->name,
            'sku' => $product->sku,
            'description' => '<p><img src="http://localhost/storage/'.$keep.'"></p>',
        ]), ['stock']))->assertOk();

        Storage::disk('public')->assertExists($keep);
        Storage::disk('public')->assertMissing($drop);
    }
}
