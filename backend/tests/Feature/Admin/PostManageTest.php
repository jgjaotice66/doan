<?php

namespace Tests\Feature\Admin;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostManageTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->admin = User::factory()->admin()->create(['name' => 'Admin Shop']);
        Sanctum::actingAs($this->admin);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'title' => 'Gundam RX-78 bản mới về hàng',
            'content' => '<p>Nội dung bài viết</p>',
            'is_published' => '1',
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function create(array $overrides = []): TestResponse
    {
        return $this->post('/api/v1/admin/posts', $this->payload($overrides), ['Accept' => 'application/json']);
    }

    // ---------- Chống XSS ----------

    public function test_script_and_dangerous_attributes_are_removed_from_content(): void
    {
        $html = '<h2>Tiêu đề</h2>'
            .'<p onclick="alert(1)">Xin <strong>chào</strong> <em>bạn</em></p>'
            .'<script>alert("xss")</script>'
            .'<p><a href="javascript:alert(1)">link xấu</a> <a href="https://example.com" target="_blank">link tốt</a></p>'
            .'<img src="x" onerror="alert(1)">'
            .'<iframe src="https://evil.test"></iframe>'
            .'<ul><li>Một</li></ul><blockquote>Trích</blockquote>';

        $id = $this->create(['content' => $html])->assertCreated()->json('data.id');
        $content = Post::findOrFail($id)->content;

        $this->assertStringNotContainsString('<script', $content);
        $this->assertStringNotContainsString('alert', $content);
        $this->assertStringNotContainsString('onclick', $content);
        $this->assertStringNotContainsString('onerror', $content);
        $this->assertStringNotContainsString('javascript:', $content);
        $this->assertStringNotContainsString('<iframe', $content);
        // Thẻ soạn thảo bình thường vẫn giữ.
        $this->assertStringContainsString('<h2>Tiêu đề</h2>', $content);
        $this->assertStringContainsString('<strong>chào</strong>', $content);
        $this->assertStringContainsString('<ul><li>Một</li></ul>', $content);
        $this->assertStringContainsString('<blockquote>Trích</blockquote>', $content);
        $this->assertStringContainsString('href="https://example.com"', $content);
        $this->assertStringContainsString('rel="noreferrer noopener"', $content);
    }

    public function test_alignment_classes_from_editor_are_kept_but_other_classes_removed(): void
    {
        $id = $this->create(['content' => '<p class="ql-align-center">Giữa</p><p class="evil big">X</p>'])->json('data.id');

        $content = Post::findOrFail($id)->content;
        $this->assertStringContainsString('<p class="ql-align-center">Giữa</p>', $content);
        $this->assertStringNotContainsString('evil', $content);
    }

    public function test_base64_images_are_not_allowed_in_content(): void
    {
        $id = $this->create(['content' => '<p>Ảnh</p><img src="data:image/png;base64,AAAA">'])->json('data.id');

        $this->assertStringNotContainsString('data:image', Post::findOrFail($id)->content);
    }

    public function test_content_with_only_dangerous_markup_is_rejected(): void
    {
        $this->create(['content' => '<script>alert(1)</script><p> </p>'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['content' => 'Nội dung bài viết không được để trống.']);

        $this->assertDatabaseCount('posts', 0);
    }

    // ---------- Tạo / xuất bản ----------

    public function test_create_post_with_auto_slug_thumbnail_and_author(): void
    {
        $response = $this->create(['thumbnail' => UploadedFile::fake()->image('cover.jpg', 1200, 630)])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'gundam-rx-78-ban-moi-ve-hang')
            ->assertJsonPath('data.status.value', 'published')
            ->assertJsonPath('data.author.name', 'Admin Shop');

        $post = Post::findOrFail($response->json('data.id'));
        $this->assertSame($this->admin->id, $post->author_id);
        $this->assertStringStartsWith('posts/', $post->thumbnail);
        Storage::disk('public')->assertExists($post->thumbnail);
        // Bật xuất bản mà không chọn ngày → đăng ngay.
        $this->assertEqualsWithDelta(now()->timestamp, $post->published_at->timestamp, 5);

        $this->getJson("/api/v1/posts/{$post->slug}")->assertOk();
    }

    public function test_same_title_gets_unique_slug_and_custom_slug_is_respected(): void
    {
        $this->create()->assertJsonPath('data.slug', 'gundam-rx-78-ban-moi-ve-hang');
        $this->create()->assertJsonPath('data.slug', 'gundam-rx-78-ban-moi-ve-hang-2');
        $this->create(['slug' => 'tin-gundam'])->assertJsonPath('data.slug', 'tin-gundam');

        $this->create(['slug' => 'tin-gundam'])->assertJsonValidationErrors(['slug' => 'Slug này đã được bài khác dùng.']);
        $this->create(['slug' => 'Có Dấu!'])->assertJsonValidationErrors('slug');
    }

    public function test_draft_is_not_visible_publicly(): void
    {
        $response = $this->create(['is_published' => '0'])
            ->assertCreated()
            ->assertJsonPath('data.status.value', 'draft');

        $this->getJson('/api/v1/posts')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/posts/'.$response->json('data.slug'))->assertNotFound();
    }

    public function test_future_publish_date_schedules_the_post(): void
    {
        // Admin chọn giờ VN (+07:00) → lưu đúng thời điểm (UTC).
        $at = now()->addDay()->setTimezone('Asia/Ho_Chi_Minh')->startOfMinute();

        $id = $this->create(['published_at' => $at->toIso8601String()])
            ->assertCreated()
            ->assertJsonPath('data.status.value', 'scheduled')
            ->json('data.id');

        $this->assertTrue(Post::findOrFail($id)->published_at->equalTo($at));
        $this->getJson('/api/v1/posts')->assertJsonCount(0, 'data');
    }

    public function test_excerpt_is_generated_from_content_when_empty(): void
    {
        $id = $this->create(['excerpt' => '', 'content' => '<h2>Mở đầu</h2><p>Đoạn&nbsp;một.</p><p>Đoạn hai.</p>'])->json('data.id');

        $this->assertSame('Mở đầu Đoạn một. Đoạn hai.', Post::findOrFail($id)->excerpt);
    }

    public function test_create_validation(): void
    {
        $this->postJson('/api/v1/admin/posts', ['title' => '', 'content' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'content']);

        $this->create(['thumbnail' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])
            ->assertJsonValidationErrors(['thumbnail' => 'Ảnh đại diện phải có định dạng jpg, png hoặc webp.']);
    }

    // ---------- Danh sách / chi tiết ----------

    public function test_admin_list_includes_drafts_and_filters_by_status_and_title(): void
    {
        $published = Post::factory()->create(['title' => 'Lego Qwzy mới']);
        $draft = Post::factory()->draft()->create(['title' => 'Bản nháp Qwzy']);
        $scheduled = Post::factory()->create(['published_at' => now()->addDays(2)]);

        $this->getJson('/api/v1/admin/posts')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonMissingPath('data.0.content');

        $this->getJson('/api/v1/admin/posts?status=draft')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $draft->id);
        $this->getJson('/api/v1/admin/posts?status=scheduled')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $scheduled->id);
        $this->getJson('/api/v1/admin/posts?status=published')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $published->id);
        $this->getJson('/api/v1/admin/posts?q=qwzy')->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/admin/posts?status=xyz')->assertJsonValidationErrors('status');
    }

    public function test_admin_can_open_a_draft_with_content(): void
    {
        $draft = Post::factory()->draft()->create(['content' => '<p>Nháp</p>']);

        $this->getJson("/api/v1/admin/posts/{$draft->id}")
            ->assertOk()
            ->assertJsonPath('data.content', '<p>Nháp</p>')
            ->assertJsonPath('data.status.label', 'Nháp');
    }

    // ---------- Sửa ----------

    public function test_update_keeps_thumbnail_unless_replaced_or_removed(): void
    {
        $old = UploadedFile::fake()->image('old.jpg')->store('posts', 'public');
        $post = Post::factory()->create(['thumbnail' => $old]);

        $this->post("/api/v1/admin/posts/{$post->id}", ['_method' => 'PUT', ...$this->payload(['title' => 'Tên mới'])], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Tên mới');
        $this->assertSame($old, $post->fresh()->thumbnail);

        $this->post("/api/v1/admin/posts/{$post->id}", ['_method' => 'PUT', ...$this->payload(['remove_thumbnail' => '1'])], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.thumbnail', null);
        Storage::disk('public')->assertMissing($old);
    }

    public function test_update_keeps_original_publish_date(): void
    {
        $post = Post::factory()->create(['published_at' => now()->subDays(10)]);
        $original = $post->published_at;

        $this->putJson("/api/v1/admin/posts/{$post->id}", $this->payload(['slug' => $post->slug]))->assertOk();

        $this->assertTrue($post->fresh()->published_at->equalTo($original));
    }

    public function test_update_can_keep_its_own_slug(): void
    {
        $post = Post::factory()->create(['slug' => 'tin-cu']);

        $this->putJson("/api/v1/admin/posts/{$post->id}", $this->payload(['slug' => 'tin-cu']))
            ->assertOk()
            ->assertJsonPath('data.slug', 'tin-cu');
    }

    // ---------- Ảnh trong nội dung ----------

    public function test_upload_content_image_returns_url(): void
    {
        $url = $this->post('/api/v1/admin/posts/images', ['image' => UploadedFile::fake()->image('in.png')], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('url');

        $this->assertStringContainsString('/storage/posts/content/', $url);
        Storage::disk('public')->assertExists('posts/content/'.basename($url));

        $this->post('/api/v1/admin/posts/images', ['image' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors('image');
    }

    public function test_removed_content_images_are_deleted_on_update_and_destroy(): void
    {
        $keep = UploadedFile::fake()->image('keep.png')->store('posts/content', 'public');
        $drop = UploadedFile::fake()->image('drop.png')->store('posts/content', 'public');
        $thumb = UploadedFile::fake()->image('t.png')->store('posts', 'public');
        $img = fn (string $path) => '<img src="'.Storage::disk('public')->url($path).'">';
        $post = Post::factory()->create(['thumbnail' => $thumb, 'content' => '<p>A</p>'.$img($keep).$img($drop)]);

        $this->putJson("/api/v1/admin/posts/{$post->id}", $this->payload(['slug' => $post->slug, 'content' => '<p>A</p>'.$img($keep)]))->assertOk();
        Storage::disk('public')->assertExists($keep);
        Storage::disk('public')->assertMissing($drop);

        $this->deleteJson("/api/v1/admin/posts/{$post->id}")->assertNoContent();
        $this->assertModelMissing($post);
        Storage::disk('public')->assertMissing($keep);
        Storage::disk('public')->assertMissing($thumb);
    }

    public function test_customer_gets_403(): void
    {
        $post = Post::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/posts')->assertForbidden();
        $this->postJson('/api/v1/admin/posts', $this->payload())->assertForbidden();
        $this->deleteJson("/api/v1/admin/posts/{$post->id}")->assertForbidden();
        $this->assertModelExists($post);
    }
}
