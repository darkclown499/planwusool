<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\LoyaltySetting;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class TestSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment() !== 'testing') {
            abort(403, 'TestSeeder can only run in testing environment.');
        }

        $dbConnection = config('database.default');
        $dbDatabase = config('database.connections.' . $dbConnection . '.database');

        if ($dbConnection !== 'sqlite') {
            abort(403, 'TestSeeder requires sqlite connection, got: ' . $dbConnection);
        }

        if (str_contains((string) $dbDatabase, 'sql_wusool_ps') || str_contains((string) $dbDatabase, 'wusool')) {
            abort(403, 'TestSeeder refused to run on production database: ' . $dbDatabase);
        }

        $this->command->info('Seeding E2E test environment: ' . $dbConnection . ' @ ' . $dbDatabase);

        // Permissions + roles first so the E2E merchant can be granted the
        // standard `company` role (idempotent — same as DatabaseSeeder).
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);

        // Merchant — onboarded (skip onboarding wizard in E2E) and granted the
        // standard company role so permission-gated areas (products, orders,
        // customers, analytics, ...) are reachable during Playwright runs.
        $merchantEmail = env('E2E_MERCHANT_EMAIL', 'test.merchant@example.test');
        $merchantPassword = env('E2E_MERCHANT_PASSWORD', 'password');

        $merchant = User::firstOrCreate(
            ['email' => $merchantEmail],
            [
                'name' => 'Test Merchant',
                'password' => Hash::make($merchantPassword),
                'type' => 'company',
                'email_verified_at' => now(),
                'plan_id' => Plan::first()?->id,
                'is_enable_login' => 1,
                'onboarded_at' => now(),
            ]
        );
        $merchant->assignRole(Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web']));

        // Store
        $store = Store::firstOrCreate(
            ['slug' => 'e2e-test-store'],
            [
                'name' => 'E2E Test Store',
                'description' => 'Isolated test store for Playwright E2E',
                'theme' => 'bazaar-market',
                'user_id' => $merchant->id,
                'email' => 'e2e@test.store',
            ]
        );

        // Ensure merchant current_store points to test store
        if ((int) $merchant->current_store !== (int) $store->id) {
            $merchant->forceFill(['current_store' => $store->id])->save();
        }

        // Categories
        $cat1 = Category::firstOrCreate(
            ['slug' => 'e2e-cat-1', 'store_id' => $store->id],
            ['name' => 'Test Category 1', 'description' => 'E2E test', 'store_id' => $store->id, 'sort_order' => 1, 'is_active' => true]
        );
        $cat2 = Category::firstOrCreate(
            ['slug' => 'e2e-cat-2', 'store_id' => $store->id],
            ['name' => 'Test Category 2', 'description' => 'E2E test', 'store_id' => $store->id, 'sort_order' => 2, 'is_active' => true]
        );

        // Products
        $productData = [
            ['name' => 'Test Product Simple', 'price' => 100, 'stock' => 50, 'category_id' => $cat1->id, 'cover_image' => '/images/store/spices.jpg'],
            ['name' => 'Test Product Variant', 'price' => 200, 'stock' => 30, 'category_id' => $cat1->id, 'cover_image' => '/images/store/sweets.jpg', 'variants' => json_encode([['name' => 'Size', 'values' => ['S','M']]])],
            ['name' => 'Test Product Second Cat', 'price' => 150, 'stock' => 20, 'category_id' => $cat2->id, 'cover_image' => '/images/store/coffee.jpg'],
        ];

        foreach ($productData as $idx => $pdata) {
            Product::firstOrCreate(
                ['store_id' => $store->id, 'name' => $pdata['name']],
                [
                    'sku' => 'E2E-P' . ($idx+1) . '-' . time(),
                    'description' => 'E2E test product',
                    'price' => $pdata['price'],
                    'stock' => $pdata['stock'],
                    'category_id' => $pdata['category_id'],
                    'store_id' => $store->id,
                    'is_active' => true,
                    'cover_image' => $pdata['cover_image'],
                    'images' => $pdata['cover_image'],
                    'variants' => $pdata['variants'] ?? null,
                ]
            );
        }

        // Customer
        $customerEmail = env('E2E_CUSTOMER_EMAIL', 'test.customer@example.test');
        $customerPassword = env('E2E_CUSTOMER_PASSWORD', 'password');

        $customer = Customer::firstOrCreate(
            ['email' => $customerEmail, 'store_id' => $store->id],
            [
                'first_name' => 'Test',
                'last_name' => 'Customer',
                'password' => Hash::make($customerPassword),
                'phone' => '0599000000',
                'is_active' => true,
                'store_id' => $store->id,
                'email_verified_at' => now(),
            ]
        );

        // Loyalty
        $loyalty = LoyaltySetting::forStore($store->id);
        $loyalty->update([
            'is_enabled' => true,
            'points_per_currency' => 1,
            'points_value' => 0.1,
            'minimum_redemption_points' => 10,
            'maximum_discount_percentage' => 50,
        ]);

        $this->command->info('TestSeeder completed: store e2e-test-store, merchant ' . $merchantEmail . ', customer ' . $customerEmail);
    }
}
