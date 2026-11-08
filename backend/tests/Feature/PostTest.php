<?php

namespace Tests\Feature;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_list_only_shows_published_posts_newest_first(): void
    {
        $old = Post::factory()->create(['published_at' => now()->subDays(5)]);
        $new = Post::factory()->create(['published_at' => now()->subHour()]);
        Post::factory()->draft()->create();
        Post::factory()->create(['published_at' => now()->addDay()]); // hẹn giờ, chưa tới
        Post::factory()->create(['is_published' => false, 'published_at' => now()->subDay()]); // đã gỡ xuống

        $this->getJson('/api/v1/posts')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $new->id)
            ->assertJsonPath('data.1.id', $old->id)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonStructure(['data' => [['id', 'title', 'slug', 'thumbnail', 'excerpt', 'published_at', 'author' => ['name']]]])
            ->assertJsonMissingPath('data.0.content');
    }

    public function test_public_list_is_paginated(): void
    {
        Post::factory()->count(5)->create();

        $this->getJson('/api/v1/posts?per_page=2&page=3')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.last_page', 3);
    }

    public function test_exclude_leaves_out_the_current_post_for_related_list(): void
    {
        $current = Post::factory()->create(['published_at' => now()]);
        Post::factory()->count(3)->create(['published_at' => now()->subDay()]);

        $ids = array_column($this->getJson("/api/v1/posts?per_page=3&exclude={$current->id}")->assertOk()->json('data'), 'id');

        $this->assertCount(3, $ids);
        $this->assertNotContains($current->id, $ids);
        $this->getJson('/api/v1/posts?exclude=abc')->assertJsonValidationErrors('exclude');
    }

    public function test_exclude_accepts_several_ids(): void
    {
        [$a, $b, $c] = Post::factory()->count(3)->create();

        $this->getJson("/api/v1/posts?exclude={$a->id},{$b->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $c->id);
    }

    // ---------- Khối nổi bật (1 bài to + 2 bài nhỏ) ----------

    public function test_highlights_put_latest_featured_post_first_then_two_newest_others(): void
    {
        $oldFeatured = Post::factory()->featured()->create(['published_at' => now()->subDays(20)]);
        $featured = Post::factory()->featured()->create(['published_at' => now()->subDays(10)]);
        $newest = Post::factory()->create(['published_at' => now()->subHour()]);
        $second = Post::factory()->create(['published_at' => now()->subDays(2)]);
        Post::factory()->create(['published_at' => now()->subDays(5)]);
        // Bài ghim nhưng chưa đăng / hẹn giờ không được lên khối nổi bật.
        Post::factory()->draft()->featured()->create();
        Post::factory()->featured()->create(['published_at' => now()->addDay()]);

        $this->getJson('/api/v1/posts/highlights')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', $featured->id)
            ->assertJsonPath('data.0.is_featured', true)
            ->assertJsonPath('data.1.id', $newest->id)
            ->assertJsonPath('data.2.id', $second->id)
            ->assertJsonMissingPath('data.0.content');

        $this->assertNotSame($oldFeatured->id, $this->getJson('/api/v1/posts/highlights')->json('data.0.id'));
    }

    public function test_highlights_fall_back_to_newest_post_when_nothing_is_featured(): void
    {
        $older = Post::factory()->create(['published_at' => now()->subDays(3)]);
        $newest = Post::factory()->create(['published_at' => now()->subDay()]);

        $this->getJson('/api/v1/posts/highlights')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('data.1.id', $older->id);
    }

    public function test_highlights_empty_when_no_published_posts(): void
    {
        Post::factory()->draft()->featured()->create();

        $this->getJson('/api/v1/posts/highlights')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_show_published_post_by_slug_with_content(): void
    {
        $post = Post::factory()->create(['slug' => 'gundam-moi-ve', 'content' => '<p>Nội dung</p>']);

        $this->getJson('/api/v1/posts/gundam-moi-ve')
            ->assertOk()
            ->assertJsonPath('data.id', $post->id)
            ->assertJsonPath('data.content', '<p>Nội dung</p>');
    }

    public function test_draft_and_scheduled_posts_are_not_found_publicly(): void
    {
        $draft = Post::factory()->draft()->create();
        $scheduled = Post::factory()->create(['published_at' => now()->addHour()]);

        $this->getJson("/api/v1/posts/{$draft->slug}")->assertNotFound();
        $this->getJson("/api/v1/posts/{$scheduled->slug}")->assertNotFound();
        $this->getJson('/api/v1/posts/khong-ton-tai')->assertNotFound();
    }

    public function test_scheduled_post_appears_when_its_time_comes(): void
    {
        $post = Post::factory()->create(['published_at' => now()->addHour()]);

        $this->getJson('/api/v1/posts')->assertJsonCount(0, 'data');

        $this->travel(61)->minutes();

        $this->getJson('/api/v1/posts')->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/posts/{$post->slug}")->assertOk();
    }
}
