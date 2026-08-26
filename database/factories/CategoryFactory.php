<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->word();
        return [
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name) . '-' . $this->faker->unique()->randomNumber(5),
            'description' => $this->faker->sentence(),
            'image' => 'categories/category-' . $this->faker->numberBetween(1, 5) . '.jpg',
            'store_id' => \App\Models\Store::factory(),
            'parent_id' => null,
            'sort_order' => $this->faker->numberBetween(0, 100),
            'is_active' => true,
            'created_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'updated_at' => function (array $attributes) {
                return $this->faker->dateTimeBetween($attributes['created_at'], 'now');
            },
        ];
    }
}