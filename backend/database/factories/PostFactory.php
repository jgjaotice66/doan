<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->sentence(6);

        return [
            'author_id' => User::factory()->admin(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)),
            'thumbnail' => 'https://placehold.co/1200x630/16213e/e94560?text=NEWS',
            'excerpt' => fake()->sentence(20),
            'content' => '<p>'.implode('</p><p>', fake()->paragraphs(4)).'</p>',
            'is_published' => true,
            'published_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => false,
            'published_at' => null,
        ]);
    }
}
