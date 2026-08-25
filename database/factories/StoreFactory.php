<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Store>
 */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true) . ' ' . fake()->randomNumber(3);
        return [
            'name' => $name,
            'slug' => Store::generateUniqueSlug($name) . '-' . fake()->randomNumber(4),
            'description' => fake()->sentence(),
            'theme' => fake()->randomElement(Store::ALL_TEMPLATES),
            'user_id' => User::factory(),
            'custom_domain' => null,
            'custom_subdomain' => null,
            'enable_custom_domain' => false,
            'enable_custom_subdomain' => false,
            'email' => fake()->safeEmail(),
            'is_featured' => false,
            'enable_pwa' => false,
        ];
    }
}
