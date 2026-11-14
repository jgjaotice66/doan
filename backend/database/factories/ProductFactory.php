<?php

namespace Database\Factories;

use App\Enums\ProductStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(3, true));

        return [
            'category_id' => Category::factory(),
            'brand_id' => Brand::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'sku' => 'SKU-'.fake()->unique()->numerify('#####'),
            'description' => '<p>'.implode('</p><p>', fake()->paragraphs(2)).'</p>',
            'price' => fake()->numberBetween(10, 500) * 10000,
            'sale_price' => null,
            'stock' => fake()->numberBetween(10, 100),
            'min_age' => fake()->randomElement(Product::AGE_GROUPS),
            'is_featured' => false,
            'status' => ProductStatus::Active,
        ];
    }

    /**
     * Đang giảm giá 10–30%.
     */
    public function onSale(): static
    {
        return $this->state(fn (array $attributes) => [
            'sale_price' => (int) round($attributes['price'] * fake()->randomElement([0.7, 0.8, 0.9]), -3),
        ]);
    }

    public function featured(): static
    {
        return $this->state(fn (array $attributes) => ['is_featured' => true]);
    }

    public function hidden(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ProductStatus::Hidden]);
    }

    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => ['stock' => fake()->numberBetween(0, 5)]);
    }

    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => ['stock' => 0]);
    }
}
