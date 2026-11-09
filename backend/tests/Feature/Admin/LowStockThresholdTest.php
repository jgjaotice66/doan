<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Ngưỡng "sắp hết hàng": riêng sản phẩm → danh mục → danh mục cha → ngưỡng chung (Cài đặt cửa hàng).
 * Tồn ≤ ngưỡng thì tính là sắp hết.
 */
class LowStockThresholdTest extends TestCase
{
    use RefreshDatabase;

    private Category $gundam;      // ngưỡng 10

    private Category $gundamHg;    // con của Gundam, không đặt → lấy 10 của cha

    private Category $lego;        // không đặt → ngưỡng chung

    protected function setUp(): void
    {
        parent::setUp();

        config(['shop.low_stock_threshold' => 5]);
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->gundam = Category::factory()->create(['name' => 'Gundam', 'low_stock_threshold' => 10]);
        $this->gundamHg = Category::factory()->create(['name' => 'Gundam HG', 'parent_id' => $this->gundam->id]);
        $this->lego = Category::factory()->create(['name' => 'LEGO']);
    }

    private function product(Category $category, int $stock, ?int $threshold = null): Product
    {
        return Product::factory()->for($category)->create(['stock' => $stock, 'low_stock_threshold' => $threshold]);
    }

    private function inventory(string $query = ''): array
    {
        return collect($this->getJson("/api/v1/admin/inventory?per_page=100{$query}")->assertOk()->json('data'))->keyBy('id')->all();
    }

    public function test_threshold_falls_back_from_product_to_category_to_parent_to_global(): void
    {
        $own = $this->product($this->lego, 15, threshold: 20);  // riêng 20 → sắp hết
        $byCategory = $this->product($this->gundam, 8);          // 10 theo Gundam → sắp hết
        $byParent = $this->product($this->gundamHg, 10);          // 10 theo cha → sắp hết (bằng ngưỡng)
        $byGlobal = $this->product($this->lego, 6);               // chung 5 → còn ổn

        $rows = $this->inventory();

        $this->assertSame(['value' => 20, 'source' => 'product', 'label' => 'Riêng sản phẩm này'], $rows[$own->id]['effective_low_stock_threshold']);
        $this->assertSame(['value' => 10, 'source' => 'category', 'label' => 'Theo danh mục Gundam'], $rows[$byCategory->id]['effective_low_stock_threshold']);
        $this->assertSame(['value' => 10, 'source' => 'category', 'label' => 'Theo danh mục Gundam'], $rows[$byParent->id]['effective_low_stock_threshold']);
        $this->assertSame(['value' => 5, 'source' => 'global', 'label' => 'Ngưỡng chung'], $rows[$byGlobal->id]['effective_low_stock_threshold']);

        $this->assertTrue($rows[$own->id]['low_stock']);
        $this->assertTrue($rows[$byCategory->id]['low_stock']);
        $this->assertTrue($rows[$byParent->id]['low_stock']);
        $this->assertFalse($rows[$byGlobal->id]['low_stock']);
        $this->assertSame(20, $rows[$own->id]['low_stock_threshold']); // giá trị tự đặt (cho form)
        $this->assertNull($rows[$byCategory->id]['low_stock_threshold']);
    }

    public function test_child_category_own_threshold_beats_parent(): void
    {
        $this->gundamHg->update(['low_stock_threshold' => 3]);
        $product = $this->product($this->gundamHg, 8);

        $this->assertFalse($this->inventory()[$product->id]['low_stock']);
        $this->assertSame('Theo danh mục Gundam HG', $this->inventory()[$product->id]['effective_low_stock_threshold']['label']);
    }

    public function test_every_list_and_count_uses_the_effective_threshold(): void
    {
        $this->product($this->gundam, 8);     // sắp hết (10)
        $this->product($this->lego, 8);       // ổn (5)
        $this->product($this->lego, 0);       // hết hàng
        $this->product($this->lego, 7, 7);    // sắp hết (riêng 7)

        $this->getJson('/api/v1/admin/inventory?low_stock=1')
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('summary.low_stock', 3)
            ->assertJsonPath('summary.out_of_stock', 1)
            ->assertJsonPath('summary.threshold', 5);
        $this->getJson('/api/v1/admin/products?low_stock=1')->assertJsonCount(3, 'data');
        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.low_stock', 3);

        // Cửa hàng: nhãn "sắp hết" theo ngưỡng thực tế (hết hàng hẳn thì không gọi là sắp hết).
        $badges = collect($this->getJson('/api/v1/products?per_page=24')->json('data'))->where('low_stock', true);
        $this->assertCount(2, $badges);
    }

    // ---------- Ngưỡng chung (Cài đặt cửa hàng) ----------

    public function test_admin_changes_global_threshold_in_settings(): void
    {
        $product = $this->product($this->lego, 8);
        $this->assertFalse($this->inventory()[$product->id]['low_stock']);

        $this->putJson('/api/v1/admin/settings', [
            'bank' => 'MB', 'account' => '0123456789', 'account_name' => 'TOY STORE', 'low_stock_threshold' => 10,
        ])->assertOk()->assertJsonPath('data.low_stock_threshold', 10);

        $this->getJson('/api/v1/admin/settings')->assertJsonPath('data.low_stock_threshold', 10);
        $this->assertTrue($this->inventory()[$product->id]['low_stock']);
        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.low_stock_threshold', 10);

        $this->putJson('/api/v1/admin/settings', [
            'bank' => 'MB', 'account' => '0123456789', 'account_name' => 'TOY STORE', 'low_stock_threshold' => 1001,
        ])->assertJsonValidationErrors('low_stock_threshold');
    }

    public function test_global_threshold_has_its_own_endpoint_without_bank_info(): void
    {
        $this->putJson('/api/v1/admin/settings/low-stock', ['low_stock_threshold' => 8])
            ->assertOk()
            ->assertJsonPath('data.low_stock_threshold', 8);

        $this->putJson('/api/v1/admin/settings/low-stock', [])->assertJsonValidationErrors('low_stock_threshold');
        $this->putJson('/api/v1/admin/settings/low-stock', ['low_stock_threshold' => -2])->assertJsonValidationErrors('low_stock_threshold');
    }

    // ---------- Danh mục / sản phẩm ----------

    public function test_category_threshold_is_saved_and_can_be_cleared(): void
    {
        $this->putJson("/api/v1/admin/categories/{$this->lego->id}", ['name' => 'LEGO', 'low_stock_threshold' => 4])
            ->assertOk()
            ->assertJsonPath('data.low_stock_threshold', 4);

        $this->putJson("/api/v1/admin/categories/{$this->lego->id}", ['name' => 'LEGO', 'low_stock_threshold' => null])
            ->assertOk()
            ->assertJsonPath('data.low_stock_threshold', null);

        $this->putJson("/api/v1/admin/categories/{$this->lego->id}", ['name' => 'LEGO', 'low_stock_threshold' => -1])
            ->assertJsonValidationErrors('low_stock_threshold');
    }

    public function test_quick_edit_of_product_threshold_from_inventory(): void
    {
        $product = $this->product($this->lego, 8);

        $this->patchJson("/api/v1/admin/inventory/{$product->id}/threshold", ['low_stock_threshold' => 12])
            ->assertOk()
            ->assertJsonPath('data.low_stock_threshold', 12)
            ->assertJsonPath('data.low_stock', true)
            ->assertJsonPath('data.effective_low_stock_threshold.source', 'product');

        // Bỏ ngưỡng riêng → quay về ngưỡng của danh mục / chung.
        $this->patchJson("/api/v1/admin/inventory/{$product->id}/threshold", ['low_stock_threshold' => null])
            ->assertOk()
            ->assertJsonPath('data.effective_low_stock_threshold.source', 'global');

        $this->patchJson("/api/v1/admin/inventory/{$product->id}/threshold", ['low_stock_threshold' => 'abc'])
            ->assertJsonValidationErrors('low_stock_threshold');
    }

    public function test_product_form_saves_threshold(): void
    {
        $product = $this->product($this->lego, 8);
        $payload = [
            'category_id' => $this->lego->id, 'brand_id' => $product->brand_id, 'name' => $product->name, 'sku' => $product->sku,
            'price' => 500000, 'min_age' => 8, 'status' => 'active', 'low_stock_threshold' => 9,
        ];

        $this->putJson("/api/v1/admin/products/{$product->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.low_stock_threshold', 9)
            ->assertJsonPath('data.effective_low_stock_threshold.value', 9);
    }
}
