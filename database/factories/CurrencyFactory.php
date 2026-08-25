<?php

namespace Database\Factories;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Currency>
 */
class CurrencyFactory extends Factory
{
    protected $model = Currency::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->lexify('???'));
        return [
            'name' => fake()->words(2, true),
            'code' => $code,
            'symbol' => fake()->randomElement(['$','€','£','¥','₪']),
            'is_default' => false,
        ];
    }
}
