<?php

namespace Database\Seeders;

use App\Models\AbandonedCart;
use App\Models\Customer;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Browser-QA seeder for the P5B Customer 360 surface only. Runs exclusively
 * against an isolated, throwaway sqlite database (name must contain "p5bbr"),
 * mirroring TestSeeder's guards so it can never touch a real store database.
 */
class P5bBrowserSeeder extends Seeder
{
    public function run(): void
    {
        $dbConnection = config('database.default');
        $dbDatabase = (string) config('database.connections.' . $dbConnection . '.database');

        if ($dbConnection !== 'sqlite') {
            abort(403, 'P5bBrowserSeeder requires sqlite connection, got: ' . $dbConnection);
        }

        if (str_contains($dbDatabase, 'wusool') || str_contains($dbDatabase, 'sql_wusool_ps')) {
            abort(403, 'P5bBrowserSeeder refused on non-isolated database: ' . $dbDatabase);
        }

        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            PlanSeeder::class,
        ]);

        $merchant = User::firstOrCreate(
            ['email' => 'test.merchant@example.test'],
            [
                'name' => 'Test Merchant',
                'password' => Hash::make('password'),
                'type' => 'company',
                'email_verified_at' => now(),
                'plan_id' => Plan::first()?->id,
                'is_enable_login' => 1,
                'onboarded_at' => now(),
            ]
        );
        $merchant->assignRole(Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web']));

        $store = Store::firstOrCreate(
            ['slug' => 'e2e-test-store'],
            [
                'name' => 'E2E Test Store',
                'description' => 'Isolated test store for P5B browser QA',
                'theme' => 'bazaar-market',
                'user_id' => $merchant->id,
                'email' => 'e2e@test.store',
            ]
        );

        if ((int) $merchant->current_store !== (int) $store->id) {
            $merchant->forceFill(['current_store' => $store->id])->save();
        }

        $loyalty = LoyaltySetting::forStore($store->id);
        $loyalty->update([
            'is_enabled' => true,
            'points_per_currency' => 1,
            'points_value' => 0.1,
            'minimum_redemption_points' => 10,
            'maximum_discount_percentage' => 50,
        ]);

        // Registered customer with a full 360: order + loyalty + cart + return.
        $customer = Customer::firstOrCreate(
            ['email' => 'test.customer@example.test', 'store_id' => $store->id],
            [
                'first_name' => 'Test',
                'last_name' => 'Customer',
                'password' => Hash::make('password'),
                'phone' => '0599000000',
                'is_active' => true,
                'store_id' => $store->id,
                'email_verified_at' => now(),
            ]
        );

        $order = Order::firstOrCreate(
            ['order_number' => 'BR-' . $store->id . '-ORD-001'],
            [
                'store_id' => $store->id,
                'customer_id' => $customer->id,
                'customer_email' => 'test.customer@example.test',
                'customer_first_name' => 'Test',
                'customer_last_name' => 'Customer',
                'customer_phone' => '0599000000',
                'shipping_address' => 'Test Street 1',
                'shipping_city' => 'Amman',
                'shipping_state' => 'Amman',
                'shipping_country' => 'JO',
                'billing_address' => 'Test Street 1',
                'billing_city' => 'Amman',
                'billing_state' => 'Amman',
                'billing_country' => 'JO',
                'subtotal' => 250,
                'tax_amount' => 0,
                'shipping_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => 250,
                'currency' => 'USD',
                'payment_method' => 'cod',
                'payment_status' => 'pending',
                'status' => 'pending',
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ]
        );

        LoyaltyTransaction::firstOrCreate(
            ['store_id' => $store->id, 'customer_id' => $customer->id, 'order_id' => $order->id, 'type' => 'earn'],
            [
                'points' => 100,
                'balance_after' => 100,
                'description' => 'شكراً لطلبك',
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ]
        );
        LoyaltyTransaction::firstOrCreate(
            ['store_id' => $store->id, 'customer_id' => $customer->id, 'type' => 'signup_bonus'],
            [
                'points' => 50,
                'balance_after' => 150,
                'description' => 'مكافأة التسجيل',
                'created_at' => now()->subDays(4),
                'updated_at' => now()->subDays(4),
            ]
        );

        AbandonedCart::firstOrCreate(
            ['store_id' => $store->id, 'customer_id' => $customer->id, 'cart_total' => 250, 'status' => 'abandoned'],
            [
                'customer_email' => 'test.customer@example.test',
                'customer_phone' => '0599000000',
                'cart_items' => json_encode([['name' => 'Sample', 'qty' => 1, 'price' => 250]]),
                'last_activity_at' => now()->subHours(3),
            ]
        );

        AbandonedCart::firstOrCreate(
            ['store_id' => $store->id, 'customer_id' => $customer->id, 'cart_total' => 250, 'status' => 'recovered'],
            [
                'customer_email' => 'test.customer@example.test',
                'customer_phone' => '0599000000',
                'status' => 'recovered',
                'recovered_order_id' => $order->id,
                'recovered_at' => now()->subDays(3),
                'last_activity_at' => now()->subDays(3),
            ]
        );

        OrderReturn::firstOrCreate(
            ['return_number' => 'BR-' . $store->id . '-RET-001'],
            [
                'store_id' => $store->id,
                'order_id' => $order->id,
                'customer_id' => $customer->id,
                'customer_email' => 'test.customer@example.test',
                'status' => 'requested',
                'reason' => 'مقاس خاطئ',
                'refund_status' => 'pending',
                'refund_amount' => 40,
                'refund_method' => 'cod',
                'requested_at' => now()->subDays(2),
            ]
        );

        // Guest order with no carts/loyalty/returns: exercises the zero-state UI.
        Order::firstOrCreate(
            ['order_number' => 'BR-' . $store->id . '-ORD-002'],
            [
                'store_id' => $store->id,
                'customer_id' => null,
                'customer_email' => 'guest.browser@example.test',
                'customer_first_name' => 'ضيوف',
                'customer_last_name' => 'المتصفح',
                'customer_phone' => '0592000456',
                'shipping_address' => 'Guest Street 9',
                'shipping_city' => 'Ramallah',
                'shipping_state' => 'Ramallah',
                'shipping_country' => 'PS',
                'billing_address' => 'Guest Street 9',
                'billing_city' => 'Ramallah',
                'billing_state' => 'Ramallah',
                'billing_country' => 'PS',
                'subtotal' => 60,
                'tax_amount' => 0,
                'shipping_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => 60,
                'currency' => 'USD',
                'payment_method' => 'cod',
                'payment_status' => 'pending',
                'status' => 'pending',
                'created_at' => now()->subDay(),
                'updated_at' => now()->subDay(),
            ]
        );

        $this->command->info('P5bBrowserSeeder completed: store e2e-test-store, merchant test.merchant@example.test, registered customer + guest with empty sections.');
    }
}