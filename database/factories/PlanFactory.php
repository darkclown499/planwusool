<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Plan>
 */
class PlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'price' => 29.00,
            'yearly_price' => 29.00, // Wusool: yearly only USD, price == yearly
            'duration' => 'yearly', // Wusool: yearly only
            'domain_type' => 'subdomain',
            'support_hours' => 8,
            'support_type' => 'email',
            'themes' => null,
            'max_stores' => 1,
            'max_users_per_store' => 1,
            'max_products_per_store' => 100,
            'max_warehouses' => 0,
            'description' => null,
            'enable_custdomain' => 'off',
            'enable_custsubdomain' => 'off',
            'enable_branding' => 'on',
            'pwa_business' => 'off',
            'enable_chatgpt' => 'on',
            'enable_shipping_method' => 'off',
            'enable_mobile_app' => 'off',
            'storage_limit' => 5.00,
            'is_trial' => null,
            'trial_day' => 0,
            'is_plan_enable' => 'on',
            'is_default' => false,
            'is_recommended' => false,
            'module' => null,
        ];
    }
}
