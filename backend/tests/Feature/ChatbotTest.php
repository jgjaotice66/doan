<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ChatbotTest extends TestCase
{
    use RefreshDatabase;

    private Category $gundam;

    private Category $figure;

    private Brand $bandai;

    protected function setUp(): void
    {
        parent::setUp();

        config(['shop.hotline' => '0123456789', 'shop.return_days' => 10, 'shop.shipping_fee' => 30000]);

        $this->gundam = Category::factory()->create(['name' => 'Gundam / Gunpla', 'slug' => 'gundam']);
        $this->figure = Category::factory()->create(['name' => 'Figure', 'slug' => 'figure']);
        $this->bandai = Brand::factory()->create(['name' => 'Bandai', 'slug' => 'bandai']);
    }

    private function ask(string $message, ?array $context = null): TestResponse
    {
        return $this->postJson('/api/v1/chat', array_filter(['message' => $message, 'context' => $context]));
    }

    /** @param array<string, mixed> $attributes */
    private function product(array $attributes = []): Product
    {
        return Product::factory()->create($attributes + ['category_id' => $this->figure->id]);
    }

    // ── Tìm sản phẩm ─────────────────────────────────────────────

    public function test_finds_products_by_category_and_max_price_in_free_text(): void
    {
        $cheap = $this->product(['category_id' => $this->gundam->id, 'price' => 750000]);
        $this->product(['category_id' => $this->gundam->id, 'price' => 1200000]);
        $this->product(['category_id' => $this->figure->id, 'price' => 300000]);

        $this->ask('có con gundam nào rẻ rẻ dưới 800k không shop')
            ->assertOk()
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $cheap->id)
            ->assertJsonPath('data.context.category', 'gundam')
            ->assertJsonPath('data.context.price_max', 800000)
            ->assertJsonPath('data.context.sort', 'price_asc')
            ->assertJsonPath('data.link.to', '/products?category=gundam&price_max=800000&sort=price_asc');
    }

    public function test_understands_text_without_vietnamese_accents(): void
    {
        $this->product(['category_id' => $this->gundam->id, 'price' => 900000]);

        $this->ask('GUNDAM duoi 1 trieu')
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonPath('data.context.category', 'gundam')
            ->assertJsonPath('data.context.price_max', 1000000)
            ->assertJsonCount(1, 'data.products');
    }

    /** @return array<string, array{string, ?int, ?int}> */
    public static function priceSentences(): array
    {
        return [
            'khoảng từ–đến, mượn đơn vị' => ['figure từ 1 đến 2 triệu', 1000000, 2000000],
            '1tr5' => ['figure dưới 1tr5', null, 1500000],
            'số có dấu chấm' => ['figure dưới 800.000đ', null, 800000],
            'trên' => ['figure trên 500k', 500000, null],
            'trở lên' => ['figure 2 triệu trở lên', 2000000, null],
            'tầm' => ['figure tầm 1 triệu', 800000, 1200000],
        ];
    }

    #[DataProvider('priceSentences')]
    public function test_parses_price_expressions(string $message, ?int $min, ?int $max): void
    {
        $this->ask($message)
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonPath('data.context.price_min', $min)
            ->assertJsonPath('data.context.price_max', $max);
    }

    public function test_price_uses_sale_price_when_on_sale(): void
    {
        $onSale = $this->product(['price' => 1000000, 'sale_price' => 700000]);
        $this->product(['price' => 900000]);

        $this->ask('figure dưới 800k')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $onSale->id);
    }

    public function test_age_returns_products_suitable_for_that_age(): void
    {
        $forSix = $this->product(['min_age' => 6]);
        $forThree = $this->product(['min_age' => 3]);
        $this->product(['min_age' => 14]);

        $ids = $this->ask('quà cho bé trai 6 tuổi')
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonPath('data.context.min_age', 6)
            ->json('data.products.*.id');

        $this->assertEqualsCanonicalizing([$forSix->id, $forThree->id], $ids);
    }

    public function test_finds_products_by_brand(): void
    {
        $bandai = $this->product(['brand_id' => $this->bandai->id]);
        $this->product();

        $this->ask('shop có đồ của bandai không')
            ->assertJsonPath('data.context.brand', 'bandai')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $bandai->id);
    }

    public function test_unknown_words_search_product_names(): void
    {
        $miku = $this->product(['name' => 'Nendoroid Hatsune Miku']);
        $this->product(['name' => 'Nendoroid Gojo Satoru']);

        $this->ask('nendoroid miku')
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $miku->id)
            ->assertJsonPath('data.context.q', 'nendoroid miku');
    }

    public function test_hot_in_a_product_name_is_not_treated_as_best_selling(): void
    {
        $hotWheels = $this->product(['name' => 'Hot Wheels Track Builder']);
        $this->product(['name' => 'Tomica Supra']);

        $this->ask('hot wheels')
            ->assertJsonPath('data.context.q', 'hot wheels')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $hotWheels->id);
    }

    public function test_relaxes_unmatched_keywords_but_keeps_other_filters(): void
    {
        $cheap = $this->product(['category_id' => $this->gundam->id, 'price' => 500000]);
        $this->product(['category_id' => $this->gundam->id, 'price' => 3000000]);

        $response = $this->ask('gundam xyzabc dưới 1 triệu')
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonPath('data.context.q', null)
            ->assertJsonPath('data.context.category', 'gundam')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $cheap->id);

        $this->assertStringContainsString('không thấy món nào khớp “xyzabc”', $response->json('data.text'));
    }

    public function test_never_returns_hidden_products(): void
    {
        $this->product(['name' => 'Zoro Secret', 'status' => 'hidden']);

        $this->ask('zoro secret')->assertJsonPath('data.intent', 'fallback')->assertJsonCount(0, 'data.products');
    }

    public function test_shows_at_most_four_products_and_total_count(): void
    {
        Product::factory()->count(6)->create(['category_id' => $this->figure->id]);

        $response = $this->ask('xem figure')->assertJsonCount(4, 'data.products');

        $this->assertStringContainsString('6', $response->json('data.text'));
    }

    public function test_follow_up_cheaper_uses_previous_context(): void
    {
        $cheaper = $this->product(['category_id' => $this->gundam->id, 'price' => 400000]);
        $this->product(['category_id' => $this->figure->id, 'price' => 100000]);

        $this->ask('còn cái nào rẻ hơn không', ['category' => 'gundam', 'min_shown' => 500000])
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonPath('data.context.category', 'gundam')
            ->assertJsonPath('data.context.price_max', 499999)
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.id', $cheaper->id);
    }

    public function test_no_match_with_filters_says_so_instead_of_guessing(): void
    {
        $this->product(['category_id' => $this->gundam->id, 'price' => 2000000]);

        $this->ask('gundam dưới 100k')
            ->assertJsonPath('data.intent', 'products')
            ->assertJsonCount(0, 'data.products')
            ->assertJsonPath('data.link', null);
    }

    // ── Đơn hàng ──────────────────────────────────────────────────

    public function test_orders_require_login(): void
    {
        $this->ask('đơn hàng của mình tới đâu rồi')
            ->assertJsonPath('data.intent', 'orders')
            ->assertJsonCount(0, 'data.orders')
            ->assertJsonPath('data.link.to', '/login');
    }

    public function test_lists_only_my_three_latest_orders(): void
    {
        $me = User::factory()->create();
        $mine = Order::factory()->count(4)->sequence(fn ($s) => ['created_at' => now()->subDays(4 - $s->index)])
            ->create(['user_id' => $me->id]);
        Order::factory()->create(['user_id' => User::factory()->create()->id]);
        Sanctum::actingAs($me);

        $codes = $this->ask('kiểm tra đơn hàng')
            ->assertJsonPath('data.intent', 'orders')
            ->assertJsonPath('data.link.to', '/orders')
            ->json('data.orders.*.code');

        $this->assertSame($mine->reverse()->take(3)->pluck('code')->values()->all(), $codes);
    }

    public function test_looks_up_my_order_by_code(): void
    {
        $me = User::factory()->create();
        $order = Order::factory()->status(OrderStatus::Shipping)->create(['user_id' => $me->id, 'code' => 'TS2611145K7Q']);
        Sanctum::actingAs($me);

        $response = $this->ask('đơn ts2611145k7q giao chưa')
            ->assertJsonCount(1, 'data.orders')
            ->assertJsonPath('data.orders.0.code', $order->code)
            ->assertJsonPath('data.orders.0.status.value', 'shipping');

        $this->assertStringContainsString('Đang giao', $response->json('data.text'));
    }

    public function test_cannot_see_someone_elses_order_by_code(): void
    {
        Order::factory()->create(['user_id' => User::factory()->create()->id, 'code' => 'TS2611149ZZZ']);
        Sanctum::actingAs(User::factory()->create());

        $this->ask('đơn TS2611149ZZZ')
            ->assertJsonPath('data.intent', 'orders')
            ->assertJsonCount(0, 'data.orders');
    }

    // ── Chính sách & liên hệ ─────────────────────────────────────

    public function test_return_policy_uses_configured_days(): void
    {
        config(['shop.return_days' => 14]);

        $response = $this->ask('mua về không ưng trả lại được không')->assertJsonPath('data.intent', 'returns');

        $this->assertStringContainsString('14 ngày', $response->json('data.text'));
    }

    public function test_shipping_fee_from_config(): void
    {
        $response = $this->ask('ship về Đà Nẵng bao nhiêu tiền')->assertJsonPath('data.intent', 'shipping');

        $this->assertStringContainsString('30.000đ', $response->json('data.text'));
    }

    public function test_payment_methods(): void
    {
        $text = $this->ask('thanh toán bằng gì vậy')->assertJsonPath('data.intent', 'payment')->json('data.text');

        $this->assertStringContainsString('COD', $text);
        $this->assertStringContainsString('QR', $text);
    }

    public function test_hotline_links_to_phone(): void
    {
        $this->ask('cho mình xin số điện thoại')
            ->assertJsonPath('data.intent', 'hotline')
            ->assertJsonPath('data.link.to', 'tel:0123456789');
    }

    public function test_hotline_not_configured(): void
    {
        config(['shop.hotline' => '']);

        $this->ask('hotline')->assertJsonPath('data.intent', 'hotline')->assertJsonPath('data.link', null);
    }

    // ── Chào hỏi, không hiểu, validate ───────────────────────────

    public function test_greeting_offers_suggestions(): void
    {
        $response = $this->ask('chào shop')->assertJsonPath('data.intent', 'greeting');

        $this->assertNotEmpty($response->json('data.suggestions'));
    }

    public function test_greeting_with_question_answers_the_question(): void
    {
        $this->ask('chào shop, phí ship bao nhiêu')->assertJsonPath('data.intent', 'shipping');
    }

    public function test_gibberish_falls_back_with_hotline(): void
    {
        $response = $this->ask('asdfgh qwerty')->assertJsonPath('data.intent', 'fallback');

        $this->assertStringContainsString('0123 456 789', $response->json('data.text'));
        $this->assertNotEmpty($response->json('data.suggestions'));
    }

    public function test_message_is_required_and_limited(): void
    {
        $this->postJson('/api/v1/chat', ['message' => '   '])->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->postJson('/api/v1/chat', ['message' => str_repeat('a', 501)])->assertUnprocessable();
        $this->postJson('/api/v1/chat', ['message' => 'hi', 'context' => ['sort' => 'hack']])->assertUnprocessable();
    }

    public function test_is_rate_limited(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->ask('chào')->assertOk();
        }

        $this->ask('chào')->assertTooManyRequests();
    }
}
