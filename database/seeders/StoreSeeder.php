<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    public function run(): void
    {
        if (config('app.is_demo')) {
            $this->createDemoStores();
        } else {
            $this->createMainStores();
        }
    }

    private function createDemoStores()
    {
        $companyUsers = User::where('type', 'company')->get();
        
        if ($companyUsers->isEmpty()) {
            $this->command->error('No company users found. Please run UserSeeder first.');
            return;
        }

        $storeTemplates = [
            [
                'name' => 'TechVibe',
                'description' => 'Your one-stop destination for the latest smartphones, laptops, gaming gear, smart home devices, and cutting-edge technology with expert support and warranty.',
                'email' => 'hello@techvibe.com',
                'theme' => 'gadgets',
            ],
            [
                'name' => 'Trendy Threads',
                'description' => 'Discover the latest fashion trends with our curated collection of clothing, shoes, accessories, and designer pieces for every style and occasion.',
                'email' => 'style@trendythreads.com',
                'theme' => 'fashion',
            ],
            [
                'name' => 'Cozy Corner',
                'description' => 'Transform your living space with our premium furniture, lighting, decor, and home accessories for every room.',
                'email' => 'hello@cozycorner.com',
                'theme' => 'home-decor',
            ],
            [
                'name' => 'Sweet Delights',
                'description' => 'Fresh artisan breads, custom cakes, pastries, and baked goods made daily with premium ingredients.',
                'email' => 'orders@sweetdelights.com',
                'theme' => 'bakery',
            ],
            [
                'name' => 'Daily Essentials',
                'description' => 'Complete grocery shopping with fresh produce, organic foods, household essentials, and daily necessities.',
                'email' => 'support@dailyessentials.com',
                'theme' => 'supermarket',
            ],
            [
                'name' => 'Auto Express',
                'description' => 'Quality automotive parts, accessories, tools, and maintenance products for all vehicle types.',
                'email' => 'parts@autoexpress.com',
                'theme' => 'car-accessories',
            ],
            [
                'name' => 'Wonder Toys',
                'description' => 'Educational toys, games, puzzles, and fun activities for children of all ages and developmental stages.',
                'email' => 'play@wondertoys.com',
                'theme' => 'toy',
            ]
        ];

        foreach ($companyUsers as $companyUser) {
            // Skip if user already has stores - preserve existing client data
            $existingStores = Store::where('user_id', $companyUser->id)->count();
            if ($existingStores > 0) {
                $this->command->info('Stores already exist for user: ' . $companyUser->email . '. Skipping to preserve client data.');
                continue;
            }

            if ($companyUser->email === 'company@example.com') {
                $this->createStoresForUser($companyUser, $storeTemplates);
            } else {
                $randomTemplate = $storeTemplates[array_rand($storeTemplates)];
                $randomTemplate['email'] = 'store' . $companyUser->id . '@example.com';
                $this->createStoresForUser($companyUser, [$randomTemplate]);
            }
        }

        $totalStores = Store::count();
        $this->command->info("Created {$totalStores} stores for demo version.");
    }

    private function createMainStores()
    {
        $companyUser = User::where('email', 'company@example.com')->first();
        
        if (!$companyUser) {
            $this->command->error('Company user not found. Please run UserSeeder first.');
            return;
        }

        // Skip if store already exists - preserve existing client data
        $existingStores = Store::where('user_id', $companyUser->id)->count();
        if ($existingStores > 0) {
            $this->command->info('Stores already exist for company@example.com. Skipping to preserve client data.');
            return;
        }

        $store = [
            [
                'name' => 'TechVibe',
                'description' => 'Your one-stop destination for the latest smartphones, laptops, gaming gear, smart home devices, and cutting-edge technology with expert support and warranty.',
                'email' => 'hello@techvibe.com',
                'theme' => 'gadgets',
            ]
        ];
        $this->createStoresForUser($companyUser, $store);
        
        $this->command->info('Created 1 store for main version.');
    }

    private function createStoresForUser($user, $storeTemplates)
    {
        $createdStores = [];
        foreach ($storeTemplates as $storeData) {
            $slug = Store::generateUniqueSlug($storeData['name']);
            
            $store = Store::create([
                'name' => $storeData['name'],
                'slug' => $slug,
                'description' => $storeData['description'],
                'theme' => $storeData['theme'],
                'user_id' => $user->id,
                'email' => $storeData['email'],
            ]);
            
            // Create store-specific settings for each store
            $this->createStoreSpecificSettings($user->id, $store->id);
            
            $createdStores[] = $store;
        }

        // Set current_store only if not already set - preserve existing client data
        if (!empty($createdStores) && empty($user->current_store)) {
            $user->update(['current_store' => $createdStores[0]->id]);
        }
    }
    
    /**
     * Create store-specific settings using StoreConfiguration
     */
    private function createStoreSpecificSettings($userId, $storeId)
    {
        $store = Store::find($storeId);
        $storeName = strtolower(str_replace(' ', '', $store->name));
        
        // Get favicon and logo based on store theme
        $faviconLogo = $this->getFaviconAndLogo($store->theme);
        
        $defaultStoreSettings = [
            'store_status' => 'true',
            'maintenance_mode' => 'false',
            'logo' => $faviconLogo['logo'],
            'favicon' => $faviconLogo['favicon'],
            'welcome_message' => 'Welcome to our store!',
            'store_description' => 'Discover amazing products at great prices.',
            'copyright_text' => '© 2026 Your Store Name. All rights reserved.',
            'address' => '123 Main Street',
            'city' => 'New York',
            'state' => 'NY',
            'country' => 'United States',
            'postal_code' => '10001',
            'facebook_url' => "https://facebook.com/{$storeName}",
            'instagram_url' => "https://instagram.com/{$storeName}",
            'twitter_url' => "https://x.com/{$storeName}",
            'youtube_url' => "https://youtube.com/{$storeName}",
            'whatsapp_url' => 'https://wa.me/+1234567890',
            'email' => "contact@{$storeName}.com",
            'whatsapp_widget_enabled' => 'true',
            'whatsapp_widget_phone' => '+1234567890',
            'whatsapp_widget_message' => 'Hello! I need help with...',
            'whatsapp_widget_position' => 'right',
            'whatsapp_widget_show_on_mobile' => 'true',
            'whatsapp_widget_show_on_desktop' => 'true',
            'custom_css' => '',
            'custom_javascript' => ''
        ];
        
        \App\Models\StoreConfiguration::updateConfiguration($storeId, $defaultStoreSettings);
    }
    
    private function getFaviconAndLogo($theme)
    {
        $themeAssets = [
            'gadgets' => [
                'favicon' => '/storage/media/1897/favicon.png',
                'logo' => '/storage/media/1896/header-logo.png'
            ],
            'fashion' => [
                'favicon' => '/storage/media/1899/favicon.png',
                'logo' => '/storage/media/1898/header-logo.png'
            ],
            'home-decor' => [
                'favicon' => '/storage/media/1901/favicon.png',
                'logo' => '/storage/media/1900/header-logo.png'
            ],
            'bakery' => [
                'favicon' => '/storage/media/1903/favicon.png',
                'logo' => '/storage/media/1902/header-logo.png'
            ],
            'supermarket' => [
                'favicon' => '/storage/media/1905/favicon.png',
                'logo' => '/storage/media/1904/header-logo.png'
            ],
            'car-accessories' => [
                'favicon' => '/storage/media/1907/favicon.png',
                'logo' => '/storage/media/1906/header-logo.png'
            ],
            'toy' => [
                'favicon' => '/storage/media/1909/favicon.png',
                'logo' => '/storage/media/1908/header-logo.png'
            ]
        ];
        
        return $themeAssets[$theme] ?? ['favicon' => '', 'logo' => ''];
    }
}