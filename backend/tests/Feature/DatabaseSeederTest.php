<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReturnStatus;
use App\Enums\UserRole;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Post;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed();
    }

    public function test_seeder_creates_demo_data(): void
    {
        $this->assertSame(1, User::where('role', UserRole::Admin)->count());
        $this->assertSame(8, User::where('role', UserRole::Customer)->count());
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
        $this->assertGreaterThan(0, Product::lowStock()->where('stock', '>', 0)->count());
        $this->assertGreaterThan(0, Product::where('stock', 0)->count());
        $this->assertSame(6, Product::distinct()->count('min_age'));
    }

    public function test_seeded_content_is_ready_for_demo(): void
    {
        Product::with('images')->each(function (Product $product) {
            $this->assertGreaterThanOrEqual(1, $product->images->count());
            $this->assertLessThanOrEqual(3, $product->images->count());
        });

        Banner::all()->each(fn (Banner $banner) => $this->assertStringStartsWith('/products?category=', $banner->link));
        Post::all()->each(fn (Post $post) => $this->assertStringContainsString('<h2>', $post->content));
    }

    public function test_orders_cover_every_status_and_feed_the_dashboard(): void
    {
        $this->assertGreaterThanOrEqual(35, Order::count());

        foreach (OrderStatus::cases() as $status) {
            $this->assertGreaterThan(0, Order::where('status', $status)->count(), "Thiếu đơn {$status->value}");
        }

        // Đơn huỷ sau khi đã nhận tiền: có đơn đã hoàn và có đơn còn chờ hoàn (để demo nút "Đã hoàn tiền").
        $this->assertGreaterThan(0, Order::where('status', OrderStatus::Cancelled)->where('payment_status', PaymentStatus::Refunded)->count());
        $this->assertGreaterThan(0, Order::where('status', OrderStatus::Cancelled)->where('payment_status', PaymentStatus::Paid)->count());
        // Đơn chuyển khoản còn chờ admin xác nhận tiền.
        $this->assertGreaterThan(0, Order::where('status', OrderStatus::Pending)->where('payment_status', PaymentStatus::Unpaid)->count());

        $this->assertSame(
            [ReturnStatus::Pending, ReturnStatus::Refunded],
            ReturnRequest::orderBy('id')->get()->pluck('status')->sortBy(fn ($s) => $s->value)->values()->all(),
        );

        $revenue = app(DashboardService::class)->revenue('30d');
        $this->assertGreaterThan(0, collect($revenue['points'] ?? $revenue)->sum('revenue'));
    }

    public function test_stock_matches_movement_history(): void
    {
        $sums = DB::table('stock_movements')->selectRaw('product_id, SUM(`change`) as total')->groupBy('product_id')->pluck('total', 'product_id');

        Product::withTrashed()->each(function (Product $product) use ($sums) {
            $this->assertSame($product->stock, (int) ($sums[$product->id] ?? 0), $product->name);
        });

        Order::with('items')->each(function (Order $order) {
            $this->assertSame($order->subtotal, (int) $order->items->sum(fn ($item) => $item->price * $item->quantity), $order->code);
        });
    }

    public function test_seeding_does_not_leave_the_clock_frozen(): void
    {
        $this->assertNull(Carbon::getTestNow());
    }

    public function test_admin_can_be_found_by_email(): void
    {
        $admin = User::where('email', 'admin@toystore.test')->firstOrFail();

        $this->assertTrue($admin->isAdmin());
    }
}
