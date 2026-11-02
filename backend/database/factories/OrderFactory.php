<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->numberBetween(10, 300) * 10000;
        $shippingFee = (int) config('shop.shipping_fee');

        return [
            'code' => 'TS'.fake()->unique()->numerify('########'),
            'user_id' => User::factory(),
            'recipient_name' => fake()->name(),
            'phone' => fake()->numerify('09########'),
            'address' => fake()->address(),
            'note' => null,
            'subtotal' => $subtotal,
            'shipping_fee' => $shippingFee,
            'total' => $subtotal + $shippingFee,
            'payment_method' => fake()->randomElement(PaymentMethod::cases()),
            'payment_status' => PaymentStatus::Unpaid,
            'status' => OrderStatus::Pending,
        ];
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(fn (array $attributes) => ['status' => $status]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => ['payment_status' => PaymentStatus::Paid]);
    }
}
