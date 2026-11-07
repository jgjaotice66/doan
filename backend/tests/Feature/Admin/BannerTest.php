<?php

namespace Tests\Feature\Admin;

use App\Models\Banner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BannerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Sanctum::actingAs(User::factory()->admin()->create());
    }

    private function image(string $name = 'banner.jpg'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 1600, 600);
    }

    public function test_admin_lists_all_banners_including_hidden_in_display_order(): void
    {
        $second = Banner::factory()->create(['sort_order' => 1, 'is_active' => false]);
        $first = Banner::factory()->create(['sort_order' => 0]);

        $this->getJson('/api/v1/admin/banners')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('data.1.id', $second->id)
            ->assertJsonPath('data.1.is_active', false);
    }

    public function test_create_banner_stores_image_and_goes_to_the_end(): void
    {
        Banner::factory()->create(['sort_order' => 4]);

        $response = $this->post('/api/v1/admin/banners', [
            'title' => 'Gundam tháng 11',
            'link' => '/products?brand=3',
            'is_active' => '1',
            'image' => $this->image(),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Gundam tháng 11')
            ->assertJsonPath('data.sort_order', 5)
            ->assertJsonPath('data.is_active', true);

        $banner = Banner::findOrFail($response->json('data.id'));
        Storage::disk('public')->assertExists($banner->image);
        $this->assertStringStartsWith('banners/', $banner->image);
    }

    public function test_create_validation(): void
    {
        $this->postJson('/api/v1/admin/banners', ['title' => '', 'link' => 'javascript:alert(1)'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'image', 'link']);

        $this->post('/api/v1/admin/banners', [
            'title' => 'X',
            'image' => UploadedFile::fake()->create('note.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertJsonValidationErrors(['image' => 'Ảnh phải có định dạng jpg, png hoặc webp.']);

        $this->assertDatabaseCount('banners', 0);
    }

    public function test_image_up_to_10mb_is_accepted(): void
    {
        $this->post('/api/v1/admin/banners', [
            'title' => 'Ảnh lớn',
            'image' => UploadedFile::fake()->image('big.jpg', 3200, 1200)->size(9 * 1024),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->post('/api/v1/admin/banners', [
            'title' => 'Ảnh quá lớn',
            'image' => UploadedFile::fake()->image('huge.jpg', 3200, 1200)->size(11 * 1024),
        ], ['Accept' => 'application/json'])->assertJsonValidationErrors(['image' => 'Ảnh tối đa 10MB.']);

        $this->assertDatabaseCount('banners', 1);
    }

    public function test_external_link_is_allowed(): void
    {
        $this->post('/api/v1/admin/banners', [
            'title' => 'Sự kiện',
            'link' => 'https://example.com/event',
            'image' => $this->image(),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.link', 'https://example.com/event');
    }

    public function test_update_without_image_keeps_old_file(): void
    {
        $old = $this->image()->store('banners', 'public');
        $banner = Banner::factory()->create(['image' => $old]);

        $this->post("/api/v1/admin/banners/{$banner->id}", [
            '_method' => 'PUT',
            'title' => 'Tiêu đề mới',
            'link' => '',
            'is_active' => '0',
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Tiêu đề mới')
            ->assertJsonPath('data.link', null)
            ->assertJsonPath('data.is_active', false);

        $this->assertSame($old, $banner->fresh()->image);
        Storage::disk('public')->assertExists($old);
    }

    public function test_update_with_new_image_replaces_and_deletes_old_file(): void
    {
        $old = $this->image()->store('banners', 'public');
        $banner = Banner::factory()->create(['image' => $old]);

        $this->post("/api/v1/admin/banners/{$banner->id}", [
            '_method' => 'PUT',
            'title' => $banner->title,
            'image' => $this->image('new.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $new = $banner->fresh()->image;
        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertExists($new);
        Storage::disk('public')->assertMissing($old);
    }

    public function test_toggle_hides_banner_from_storefront(): void
    {
        $banner = Banner::factory()->create();

        $this->patchJson("/api/v1/admin/banners/{$banner->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->getJson('/api/v1/banners')->assertJsonCount(0, 'data');

        $this->patchJson("/api/v1/admin/banners/{$banner->id}/toggle-active")->assertJsonPath('data.is_active', true);
        $this->getJson('/api/v1/banners')->assertJsonCount(1, 'data');
    }

    public function test_reorder_changes_storefront_order(): void
    {
        $a = Banner::factory()->create(['sort_order' => 0]);
        $b = Banner::factory()->create(['sort_order' => 1]);
        $c = Banner::factory()->create(['sort_order' => 2]);

        $this->putJson('/api/v1/admin/banners/order', ['ids' => [$c->id, $a->id, $b->id]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $c->id);

        $this->assertSame([$c->id, $a->id, $b->id], array_column($this->getJson('/api/v1/banners')->json('data'), 'id'));
    }

    public function test_reorder_requires_exactly_all_banners(): void
    {
        $a = Banner::factory()->create();
        $b = Banner::factory()->create();

        $this->putJson('/api/v1/admin/banners/order', ['ids' => [$a->id]])->assertJsonValidationErrors('ids');
        $this->putJson('/api/v1/admin/banners/order', ['ids' => [$a->id, $a->id]])->assertJsonValidationErrors('ids');
        $this->putJson('/api/v1/admin/banners/order', ['ids' => [$a->id, $b->id, 999]])->assertJsonValidationErrors('ids');
    }

    public function test_delete_removes_banner_and_file(): void
    {
        $path = $this->image()->store('banners', 'public');
        $banner = Banner::factory()->create(['image' => $path]);

        $this->deleteJson("/api/v1/admin/banners/{$banner->id}")->assertNoContent();

        $this->assertModelMissing($banner);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_customer_gets_403(): void
    {
        $banner = Banner::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/banners')->assertForbidden();
        $this->patchJson("/api/v1/admin/banners/{$banner->id}/toggle-active")->assertForbidden();
        $this->deleteJson("/api/v1/admin/banners/{$banner->id}")->assertForbidden();
        $this->putJson('/api/v1/admin/banners/order', ['ids' => [$banner->id]])->assertForbidden();
        $this->assertTrue($banner->fresh()->is_active);
    }
}
