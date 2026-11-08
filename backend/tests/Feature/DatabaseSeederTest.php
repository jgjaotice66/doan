<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Post;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_seeder_creates_demo_data(): void
    {
        $this->assertSame(1, User::where('role', UserRole::Admin)->count());
        $this->assertSame(5, User::where('role', UserRole::Customer)->count());
        $this->assertSame(8, Category::count());
        $this->assertSame(10, Brand::count());
        $this->assertSame(60, Product::count());
        $this->assertSame(3, Banner::count());
        $this->assertSame(6, Post::count());
        $this->assertSame(5, Post::published()->count());
        $this->assertSame(1, Post::published()->where('is_featured', true)->count());
    }

    public function test_seeded_products_cover_demo_cases(): void
    {
        $this->assertGreaterThan(0, Product::whereNotNull('sale_price')->count());
        $this->assertSame(0, Product::whereColumn('sale_price', '>=', 'price')->count());
        $this->assertGreaterThan(0, Product::where('is_featured', true)->count());
        $this->assertGreaterThan(0, Product::where('stock', '<=', config('shop.low_stock_threshold'))->count());
        $this->assertSame(6, Product::distinct()->count('min_age'));

        Product::with('images')->each(function (Product $product) {
            $this->assertGreaterThanOrEqual(1, $product->images->count());
            $this->assertLessThanOrEqual(3, $product->images->count());
        });
    }

    public function test_admin_can_be_found_by_email(): void
    {
        $admin = User::where('email', 'admin@toystore.test')->firstOrFail();

        $this->assertTrue($admin->isAdmin());
    }
}
