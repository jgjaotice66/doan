<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_are_returned_as_tree_with_active_product_counts(): void
    {
        $parent = Category::factory()->create(['name' => 'Mô hình', 'slug' => 'mo-hinh']);
        $child = Category::factory()->create(['name' => 'Gundam', 'slug' => 'gundam', 'parent_id' => $parent->id]);
        Category::factory()->create(['name' => 'LEGO', 'slug' => 'lego']);

        Product::factory()->count(2)->create(['category_id' => $child->id]);
        Product::factory()->hidden()->create(['category_id' => $child->id]);
        Product::factory()->create(['category_id' => $child->id])->delete();

        $response = $this->getJson('/api/v1/categories')->assertOk();

        $response->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'image', 'products_count', 'children']]]);

        $tree = collect($response->json('data'))->keyBy('slug');
        $this->assertArrayNotHasKey('gundam', $tree->all(), 'Danh mục con không được nằm ở cấp gốc');
        $this->assertSame('gundam', $tree['mo-hinh']['children'][0]['slug']);
        $this->assertSame(2, $tree['mo-hinh']['children'][0]['products_count']);
        $this->assertSame([], $tree['lego']['children']);
    }

    public function test_banks_are_public_for_refund_account_form(): void
    {
        $this->getJson('/api/v1/banks')
            ->assertOk()
            ->assertJsonCount(count(config('shop.banks')), 'data')
            ->assertJsonPath('data.0', ['code' => 'VCB', 'name' => 'Vietcombank']);
    }

    public function test_brands_are_listed_by_name(): void
    {
        Brand::factory()->create(['name' => 'Tamiya']);
        Brand::factory()->create(['name' => 'Bandai']);

        $this->getJson('/api/v1/brands')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Bandai')
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'logo']]]);
    }

    public function test_only_active_banners_are_returned_in_sort_order(): void
    {
        Banner::factory()->create(['title' => 'Thứ hai', 'sort_order' => 2]);
        Banner::factory()->create(['title' => 'Thứ nhất', 'sort_order' => 1]);
        Banner::factory()->create(['title' => 'Đang ẩn', 'sort_order' => 0, 'is_active' => false]);

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Thứ nhất')
            ->assertJsonPath('data.1.title', 'Thứ hai')
            ->assertJsonMissing(['title' => 'Đang ẩn']);
    }

    public function test_stored_image_paths_become_full_urls(): void
    {
        Brand::factory()->create(['logo' => 'brands/bandai.png']);
        Banner::factory()->create(['image' => 'https://placehold.co/1600x600']);

        $this->getJson('/api/v1/brands')
            ->assertJsonPath('data.0.logo', config('app.url').'/storage/brands/bandai.png');

        $this->getJson('/api/v1/banners')
            ->assertJsonPath('data.0.image', 'https://placehold.co/1600x600');
    }
}
