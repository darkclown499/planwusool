<?php

namespace Database\Factories;

use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Coupon>
 */
class CouponFactory extends Factory
{
    protected $model = Coupon::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'code' => strtoupper(fake()->unique()->lexify('??????')),
            'type' => fake()->randomElement(['percentage','flat']),
            'discount_amount' => fake()->randomFloat(2, 5, 50),
            'status' => 1,
            'expiry_date' => now()->addMonth(),
            'use_limit_per_coupon' => null,
            'use_limit_per_user' => null,
            'used_count' => 0,
            'created_by' => \App\Models\User::factory(),
        ];
    }
}
