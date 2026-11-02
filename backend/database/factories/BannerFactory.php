<?php

namespace Database\Factories;

use App\Models\Banner;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Banner>
 */
class BannerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'image' => 'https://placehold.co/1600x600/0f0f1a/e94560?text=Banner',
            'link' => '/products',
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
