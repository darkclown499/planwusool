<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
$plans = [
            [
                'name' => 'Starter',
                'price' => 0,
                'yearly_price' => 0,
                'duration' => 'yearly',
                'domain_type' => 'subdomain',
                'support_hours' => 8,
                'support_type' => 'email',
                'description' => 'The ideal choice to test the system and launch your first store with ease.',
                'max_stores' => 1,
                'max_users_per_store' => 1,
                'max_products_per_store' => 18,
                'max_warehouses' => 1,
'themes' => ['core-minimal', 'core-bold', 'core-sidebar', 'core-dark', 'core-bazaar', 'core-elegant', 'core-showcase'],
                    'enable_custdomain' => 'off',
                    'enable_custsubdomain' => 'on',
                    'enable_branding' => 'off',
                    'pwa_business' => 'off',
                    'enable_chatgpt' => 'off',
                    'enable_shipping_method' => 'off',
                    'enable_mobile_app' => 'off',
                    'enable_sms' => 'off',
                    'enable_theme_editor' => 'off',
                    'template_editor_level' => 'none',
                    'storage_limit' => 1,
                    'is_trial' => null,
                    'trial_day' => 0,
                    'is_plan_enable' => 'on',
                    'is_default' => true,
                    'is_recommended' => false,
                    'module' => null
                ],
            [
                'name' => 'Growth',
                'price' => 299,
                'yearly_price' => 299,
                'duration' => 'yearly',
                'domain_type' => 'subdomain',
                'support_hours' => 12,
                'support_type' => 'whatsapp,email',
                'description' => 'The best-selling plan, designed to expand your business and increase your sales.',
                'max_stores' => 1,
                'max_users_per_store' => 1,
                'max_products_per_store' => 500,
                'max_warehouses' => 2,
'themes' => ['core-minimal', 'core-bold', 'core-sidebar', 'core-dark', 'core-bazaar', 'core-elegant', 'core-showcase', 'growth-electronics', 'growth-fashion', 'growth-food', 'growth-cosmetics', 'growth-supermarket', 'growth-home-decor', 'growth-pharmacy'],
                    'enable_custdomain' => 'off',
                    'enable_custsubdomain' => 'on',
                    'enable_branding' => 'off',
                    'pwa_business' => 'on',
                    'enable_chatgpt' => 'on',
                    'enable_shipping_method' => 'on',
                    'enable_mobile_app' => 'off',
                    'enable_sms' => 'on',
                    'enable_theme_editor' => 'off',
                    'template_editor_level' => 'limited',
                    'storage_limit' => 10,
                    'is_trial' => 'on',
                    'trial_day' => 14,
                    'is_plan_enable' => 'on',
                    'is_default' => false,
                    'is_recommended' => true,
                    'module' => null
                ],
            [
                'name' => 'Professional',
                'price' => 399,
                'yearly_price' => 399,
                'duration' => 'yearly',
                'domain_type' => 'custom',
                'support_hours' => 24,
                'support_type' => 'whatsapp,email,vip',
                'description' => 'The comprehensive solution for businesses, fully customizable to your needs.',
                'max_stores' => 2,
                'max_users_per_store' => 5,
                'max_products_per_store' => 10000,
                'max_warehouses' => 3,
'themes' => ['core-minimal', 'core-bold', 'core-sidebar', 'core-dark', 'core-bazaar', 'core-elegant', 'core-showcase', 'growth-electronics', 'growth-fashion', 'growth-food', 'growth-cosmetics', 'growth-supermarket', 'growth-home-decor', 'growth-pharmacy', 'pro-tech', 'pro-beauty', 'pro-books', 'pro-sport', 'pro-pets', 'pro-flowers', 'pro-coffee', 'pro-stationery', 'pro-spices', 'pro-clothing', 'pro-fragrances', 'pro-home-tools', 'pro-kids', 'pro-sports', 'pro-boutique'],
                    'enable_custdomain' => 'on',
                    'enable_custsubdomain' => 'on',
                    'enable_branding' => 'on',
                    'pwa_business' => 'on',
                    'enable_chatgpt' => 'on',
                    'enable_shipping_method' => 'on',
                    'enable_mobile_app' => 'on',
                    'enable_sms' => 'on',
                    'enable_theme_editor' => 'on',
                    'template_editor_level' => 'full',
                    'storage_limit' => 50,
                'is_trial' => null,
                'trial_day' => 0,
                'is_plan_enable' => 'on',
                'is_default' => false,
                'is_recommended' => false,
                'module' => null
            ]
        ];
        
        foreach ($plans as $planData) {
            Plan::updateOrCreate(
                ['name' => $planData['name']],
                $planData
            );
        }
    }
}

