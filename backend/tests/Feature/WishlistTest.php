<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_guest_gets_401(): void
    {
        $product = Product::factory()->create();

        $this->getJson('/api/v1/wishlist')->assertUnauthorized();
        $this->postJson('/api/v1/wishlist', ['product_id' => $product->id])->assertUnauthorized();
        $this->deleteJson("/api/v1/wishlist/{$product->id}")->assertUnauthorized();
    }

    public function test_adding_twice_creates_only_one_record(): void
    {
        $product = Product::factory()->create();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => $product->id])
            ->assertCreated()
            ->assertJsonPath('data.id', $product->id);

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => $product->id])
            ->assertCreated();

        $this->assertDatabaseCount('wishlists', 1);
    }

    public function test_cannot_add_hidden_or_missing_product(): void
    {
        $hidden = Product::factory()->hidden()->create();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => $hidden->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_id']);

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => 999999])
            ->assertUnprocessable();

        $this->assertDatabaseCount('wishlists', 0);
    }

    public function test_lists_own_active_products_newest_first(): void
    {
        $old = Product::factory()->create(['slug' => 'thich-truoc']);
        $new = Product::factory()->create(['slug' => 'thich-sau']);
        $hidden = Product::factory()->create(['slug' => 'bi-an-sau-khi-thich']);
        $this->user->wishlist()->attach($old, ['created_at' => now()->subDay()]);
        $this->user->wishlist()->attach([$new->id, $hidden->id]);
        $hidden->update(['status' => 'hidden']);

        User::factory()->create()->wishlist()->attach(Product::factory()->create(['slug' => 'cua-nguoi-khac']));

        $response = $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/wishlist')->assertOk();

        $this->assertSame(['thich-sau', 'thich-truoc'], collect($response->json('data'))->pluck('slug')->all());
        $response->assertJsonStructure(['data' => [['id', 'name', 'slug', 'final_price', 'thumbnail', 'in_stock', 'brand']]]);
    }

    public function test_remove_only_affects_own_wishlist(): void
    {
        $product = Product::factory()->create();
        $other = User::factory()->create();
        $this->user->wishlist()->attach($product);
        $other->wishlist()->attach($product);

        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/wishlist/{$product->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('wishlists', ['user_id' => $this->user->id, 'product_id' => $product->id]);
        $this->assertDatabaseHas('wishlists', ['user_id' => $other->id, 'product_id' => $product->id]);

        // Xoá lần nữa vẫn 204 (bấm trái tim 2 lần khi mạng chậm không báo lỗi).
        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/wishlist/{$product->id}")
            ->assertNoContent();
    }

    public function test_product_detail_reflects_wishlist_changes(): void
    {
        $product = Product::factory()->create(['slug' => 'chi-tiet']);

        $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);
        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/products/chi-tiet')->assertJsonPath('data.is_wishlisted', true);

        $this->actingAs($this->user, 'sanctum')->deleteJson("/api/v1/wishlist/{$product->id}");
        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/products/chi-tiet')->assertJsonPath('data.is_wishlisted', false);
    }
}
