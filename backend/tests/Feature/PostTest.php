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
