<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CategoryBrandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Sanctum::actingAs(User::factory()->admin()->create());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function adminEndpoints(): array
    {
        return [
            'categories index' => ['get', '/api/v1/admin/categories'],
            'categories store' => ['post', '/api/v1/admin/categories'],
            'categories delete' => ['delete', '/api/v1/admin/categories/1'],
            'brands index' => ['get', '/api/v1/admin/brands'],
            'brands store' => ['post', '/api/v1/admin/brands'],
            'brands delete' => ['delete', '/api/v1/admin/brands/1'],
        ];
    }

    #[DataProvider('adminEndpoints')]
    public function test_customer_gets_403(string $method, string $uri): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->json($method, $uri)->assertForbidden();
    }

    // ---------- Danh mục ----------

    public function test_admin_creates_category_with_vietnamese_slug_and_image(): void
    {
        $response = $this->postJson('/api/v1/admin/categories', [
            'name' => 'Mô hình Đồ chơi',
            'image' => UploadedFile::fake()->image('cat.jpg', 400, 400),
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Mô hình Đồ chơi')
            ->assertJsonPath('data.slug', 'mo-hinh-do-choi')
            ->assertJsonPath('data.parent_id', null);

        $category = Category::findOrFail($response->json('data.id'));
        $this->assertNotNull($category->image);
        Storage::disk('public')->assertExists($category->image);
    }

    public function test_duplicate_slug_gets_numeric_suffix(): void
    {
        $figure = Category::factory()->create(['name' => 'Figure', 'slug' => 'figure']);
        $anime = Category::factory()->create(['name' => 'Anime']);

        // Cùng tên "Figure" nhưng ở danh mục cha khác → hợp lệ, slug tự thêm -2.
        $this->postJson('/api/v1/admin/categories', ['name' => 'Figure', 'parent_id' => $anime->id])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'figure-2');

        // Trùng tên trong cùng cấp → báo lỗi.
        $this->postJson('/api/v1/admin/categories', ['name' => 'figure'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertSame('figure', $figure->fresh()->slug);
    }

    public function test_update_renames_replaces_image_and_deletes_old_file(): void
    {
        Storage::disk('public')->put('categories/old.jpg', 'x');
        $category = Category::factory()->create(['name' => 'Cũ', 'slug' => 'cu', 'image' => 'categories/old.jpg']);

        $this->postJson("/api/v1/admin/categories/{$category->id}", [
            '_method' => 'PUT',
            'name' => 'Lắp ráp',
            'image' => UploadedFile::fake()->image('new.png'),
        ])->assertOk()
            ->assertJsonPath('data.slug', 'lap-rap');

        $category->refresh();
        Storage::disk('public')->assertMissing('categories/old.jpg');
        Storage::disk('public')->assertExists($category->image);
    }

    public function test_update_can_remove_image(): void
    {
        Storage::disk('public')->put('categories/old.jpg', 'x');
        $category = Category::factory()->create(['image' => 'categories/old.jpg']);

        $this->putJson("/api/v1/admin/categories/{$category->id}", ['name' => $category->name, 'remove_image' => true])
            ->assertOk()
            ->assertJsonPath('data.image', null);

        Storage::disk('public')->assertMissing('categories/old.jpg');
    }

    public function test_image_must_be_small_image(): void
    {
        $this->postJson('/api/v1/admin/categories', [
            'name' => 'Ảnh lớn',
            'image' => UploadedFile::fake()->create('big.jpg', 3000, 'image/jpeg'),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->postJson('/api/v1/admin/categories', [
            'name' => 'Không phải ảnh',
            'image' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_parent_rules_keep_tree_two_levels_without_cycles(): void
    {
        $root = Category::factory()->create();
        $child = Category::factory()->create(['parent_id' => $root->id]);
        $other = Category::factory()->create();

        // Chính nó làm cha.
        $this->putJson("/api/v1/admin/categories/{$root->id}", ['name' => $root->name, 'parent_id' => $root->id])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');

        // Cha phải là danh mục gốc (không tạo cấp 3).
        $this->postJson('/api/v1/admin/categories', ['name' => 'Cấp ba', 'parent_id' => $child->id])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');

        // Danh mục đang có con không thể trở thành danh mục con.
        $this->putJson("/api/v1/admin/categories/{$root->id}", ['name' => $root->name, 'parent_id' => $other->id])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');

        // Chuyển con sang cha khác thì được.
        $this->putJson("/api/v1/admin/categories/{$child->id}", ['name' => $child->name, 'parent_id' => $other->id])
            ->assertOk()->assertJsonPath('data.parent_id', $other->id);
    }

    public function test_cannot_delete_category_with_products_even_soft_deleted(): void
    {
        $category = Category::factory()->create();
        $product = Product::factory()->for($category)->create();
        $product->delete();

        $this->deleteJson("/api/v1/admin/categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category' => 'Danh mục còn 1 sản phẩm']);

        $this->assertModelExists($category);
    }

    public function test_cannot_delete_category_with_children(): void
    {
        $root = Category::factory()->create();
        Category::factory()->create(['parent_id' => $root->id]);

        $this->deleteJson("/api/v1/admin/categories/{$root->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category' => 'danh mục con']);
    }

    public function test_delete_empty_category_removes_image(): void
    {
        Storage::disk('public')->put('categories/a.jpg', 'x');
        $category = Category::factory()->create(['image' => 'categories/a.jpg']);

        $this->deleteJson("/api/v1/admin/categories/{$category->id}")->assertNoContent();

        $this->assertModelMissing($category);
        Storage::disk('public')->assertMissing('categories/a.jpg');
    }

    public function test_category_index_searches_paginates_and_counts_products(): void
    {
        $gundam = Category::factory()->create(['name' => 'Gundam']);
        Product::factory()->count(2)->for($gundam)->create();
        Category::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/categories?q=gund')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Gundam')
            ->assertJsonPath('data.0.products_count', 2);

        $this->getJson('/api/v1/admin/categories?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('meta.per_page', 2);
    }

    // ---------- Thương hiệu ----------

    public function test_admin_creates_updates_brand_with_logo(): void
    {
        $id = $this->postJson('/api/v1/admin/brands', [
            'name' => 'Bandai Spirits',
            'logo' => UploadedFile::fake()->image('logo.webp'),
        ])->assertCreated()
            ->assertJsonPath('data.slug', 'bandai-spirits')
            ->json('data.id');

        $oldLogo = Brand::findOrFail($id)->logo;
        Storage::disk('public')->assertExists($oldLogo);

        $this->postJson("/api/v1/admin/brands/{$id}", [
            '_method' => 'PUT',
            'name' => 'Bandai',
            'logo' => UploadedFile::fake()->image('logo2.png'),
        ])->assertOk()->assertJsonPath('data.slug', 'bandai');

        Storage::disk('public')->assertMissing($oldLogo);
    }

    public function test_brand_name_must_be_unique(): void
    {
        $brand = Brand::factory()->create(['name' => 'LEGO']);

        $this->postJson('/api/v1/admin/brands', ['name' => 'lego'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        // Sửa chính nó, giữ nguyên tên → hợp lệ.
        $this->putJson("/api/v1/admin/brands/{$brand->id}", ['name' => 'LEGO'])->assertOk();
    }

    public function test_cannot_delete_brand_with_products(): void
    {
        $brand = Brand::factory()->create();
        Product::factory()->count(3)->for($brand)->create();

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['brand' => 'Thương hiệu còn 3 sản phẩm']);
    }

    public function test_delete_brand(): void
    {
        $brand = Brand::factory()->create();

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")->assertNoContent();

        $this->assertModelMissing($brand);
    }

    public function test_brand_index_counts_products(): void
    {
        $brand = Brand::factory()->create(['name' => 'Hot Toys']);
        Product::factory()->for($brand)->create();

        $this->getJson('/api/v1/admin/brands?q=hot')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.products_count', 1)
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'per_page', 'total']]);
    }
}
