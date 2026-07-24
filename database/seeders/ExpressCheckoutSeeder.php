<?php

namespace Database\Seeders;

use App\Models\ExpressCheckout;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ExpressCheckoutSeeder extends Seeder
{
    public function run(): void
    {
        // Check if express checkout data already exists
        if (ExpressCheckout::exists()) {
            $this->command->info('Express checkout data already exists. Skipping seeder to preserve existing data.');
            return;
        }
        
        $stores = Store::all();
        
        if ($stores->isEmpty()) {
            $this->command->error('No stores found. Please run StoreSeeder first.');
            return;
        }

        $checkouts = config('app.is_demo') ? $this->getDemoCheckouts() : $this->getMainCheckouts();
        $totalCreated = 0;

        foreach ($stores as $storeIndex => $store) {
            $storeCheckouts = config('app.is_demo') ? 
                array_slice($checkouts, 0, rand(4, 6)) : 
                array_slice($checkouts, 0, rand(3, 4));

            foreach ($storeCheckouts as $index => $checkout) {
                $createdDaysAgo = rand(30, 90) + ($storeIndex * 3) + $index;
                $createdAt = Carbon::now()->subDays($createdDaysAgo);
                $updatedDaysAgo = rand(1, $createdDaysAgo - 1);
                $updatedAt = Carbon::now()->subDays($updatedDaysAgo);
                
                ExpressCheckout::firstOrCreate(
                    ['name' => $checkout['name'], 'store_id' => $store->id],
                    array_merge($checkout, [
                        'store_id' => $store->id,
                        'conversions' => rand(50, 300),
                        'revenue' => rand(5000, 25000) / 100,
                        'created_at' => $createdAt,
                        'updated_at' => $updatedAt,
                    ])
                );
                $totalCreated++;
            }
        }

    }

    private function getDemoCheckouts(): array
    {
        return [
            [
                'name' => 'Quick Buy Express',
                'type' => 'buy_now',
                'description' => 'Skip cart and buy instantly with one click',
                'button_text' => 'Buy Now',
                'button_color' => '#007bff',
                'is_active' => true,
                'payment_methods' => ['credit_card', 'paypal', 'apple_pay'],
                'default_payment_method' => 'credit_card',
                'skip_cart' => true,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => true,
                'mobile_optimized' => true,
                'save_payment_methods' => true,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'Express Cart Checkout',
                'type' => 'express_cart',
                'description' => 'Fast checkout with saved customer details',
                'button_text' => 'Express Checkout',
                'button_color' => '#28a745',
                'is_active' => true,
                'payment_methods' => ['credit_card', 'paypal', 'apple_pay', 'google_pay'],
                'default_payment_method' => 'paypal',
                'skip_cart' => false,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => false,
                'mobile_optimized' => true,
                'save_payment_methods' => true,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'Mobile Pay Express',
                'type' => 'mobile_optimized',
                'description' => 'Optimized checkout experience for mobile devices',
                'button_text' => 'Mobile Pay',
                'button_color' => '#6f42c1',
                'is_active' => true,
                'payment_methods' => ['apple_pay', 'google_pay', 'samsung_pay'],
                'default_payment_method' => 'apple_pay',
                'skip_cart' => true,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => true,
                'mobile_optimized' => true,
                'save_payment_methods' => true,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'Guest Quick Checkout',
                'type' => 'guest_checkout',
                'description' => 'Checkout without account registration required',
                'button_text' => 'Guest Checkout',
                'button_color' => '#dc3545',
                'is_active' => true,
                'payment_methods' => ['credit_card', 'paypal'],
                'default_payment_method' => 'credit_card',
                'skip_cart' => false,
                'auto_fill_customer_data' => false,
                'guest_checkout_allowed' => true,
                'mobile_optimized' => false,
                'save_payment_methods' => false,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'One Click Purchase',
                'type' => 'buy_now',
                'description' => 'Single click instant purchase with saved payment',
                'button_text' => 'One Click Buy',
                'button_color' => '#fd7e14',
                'is_active' => true,
                'payment_methods' => ['paypal', 'apple_pay', 'google_pay'],
                'default_payment_method' => 'paypal',
                'skip_cart' => true,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => false,
                'mobile_optimized' => true,
                'save_payment_methods' => true,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'Premium Express',
                'type' => 'express_cart',
                'description' => 'VIP checkout experience for premium customers',
                'button_text' => 'Premium Checkout',
                'button_color' => '#6c757d',
                'is_active' => false,
                'payment_methods' => ['credit_card', 'paypal', 'apple_pay', 'google_pay'],
                'default_payment_method' => 'credit_card',
                'skip_cart' => false,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => false,
                'mobile_optimized' => true,
                'save_payment_methods' => true,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ]
        ];
    }

    private function getMainCheckouts(): array
    {
        return [
            [
                'name' => 'Quick Buy',
                'type' => 'buy_now',
                'description' => 'Skip cart and buy instantly',
                'button_text' => 'Buy Now',
                'button_color' => '#007bff',
                'is_active' => true,
                'payment_methods' => ['credit_card', 'paypal'],
                'default_payment_method' => 'credit_card',
                'skip_cart' => true,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => true,
                'mobile_optimized' => true,
                'save_payment_methods' => false,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'Express Checkout',
                'type' => 'express_cart',
                'description' => 'Fast checkout with saved details',
                'button_text' => 'Express Checkout',
                'button_color' => '#28a745',
                'is_active' => true,
                'payment_methods' => ['credit_card', 'paypal', 'apple_pay'],
                'default_payment_method' => 'paypal',
                'skip_cart' => false,
                'auto_fill_customer_data' => true,
                'guest_checkout_allowed' => false,
                'mobile_optimized' => true,
                'save_payment_methods' => true,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ],
            [
                'name' => 'Guest Checkout',
                'type' => 'guest_checkout',
                'description' => 'Checkout without registration',
                'button_text' => 'Guest Checkout',
                'button_color' => '#dc3545',
                'is_active' => true,
                'payment_methods' => ['credit_card'],
                'default_payment_method' => 'credit_card',
                'skip_cart' => false,
                'auto_fill_customer_data' => false,
                'guest_checkout_allowed' => true,
                'mobile_optimized' => false,
                'save_payment_methods' => false,
                'success_redirect_url' => '/thank-you',
                'cancel_redirect_url' => '/cart'
            ]
        ];
    }
}