<?php

namespace Database\Factories;

use App\Enums\StockReason;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'change' => fake()->numberBetween(5, 50),
            'reason' => StockReason::Import,
            'order_id' => null,
            'user_id' => null,
            'note' => null,
        ];
    }
}
