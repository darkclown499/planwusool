<?php

namespace Database\Seeders;

use App\Models\StoreCoupon;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class StoreCouponSeeder extends Seeder
{
    public function run(): void
    {
        // Check if store coupon data already exists
        if (StoreCoupon::exists()) {
            $this->command->info('Store coupon data already exists. Skipping seeder to preserve existing data.');
            return;
        }
        
        if (config('app.is_demo')) {
            $this->createDemoStoreCoupons();
        } else {
            $this->createMainVersionStoreCoupons();
        }
    }

    private function createDemoStoreCoupons()
    {
        $stores = Store::with('user')->get();

        if ($stores->isEmpty()) {
            $this->command->error('No stores found. Please run StoreSeeder first.');
            return;
        }

        $totalCoupons = 0;
        foreach ($stores as $storeIndex => $store) {
            $randomCount = rand(5, 9);
            $coupons = array_slice($this->getAllCoupons($store->id), 0, $randomCount);
            
            foreach ($coupons as $couponIndex => $couponData) {
                $createdDaysAgo = rand(30, 90) + ($storeIndex * 3) + $couponIndex;
                $createdAt = Carbon::now()->subDays($createdDaysAgo);
                $updatedDaysAgo = rand(1, $createdDaysAgo - 1);
                $updatedAt = Carbon::now()->subDays($updatedDaysAgo);
                
                StoreCoupon::firstOrCreate(
                    ['code' => $couponData['code'], 'store_id' => $store->id],
                    [
                        'name' => $couponData['name'],
                        'description' => $couponData['description'],
                        'code_type' => 'manual',
                        'type' => $couponData['type'],
                        'discount_amount' => $couponData['discount_amount'],
                        'minimum_spend' => $couponData['minimum_spend'],
                        'maximum_spend' => $couponData['maximum_spend'] ?? null,
                        'use_limit_per_coupon' => $couponData['use_limit_per_coupon'],
                        'use_limit_per_user' => $couponData['use_limit_per_user'],
                        'used_count' => 0,
                        'start_date' => $createdAt,
                        'expiry_date' => $createdAt->copy()->addMonths(3),
                        'status' => true,
                        'store_id' => $store->id,
                        'created_by' => $store->user->id,
                        'created_at' => $createdAt,
                        'updated_at' => $updatedAt,
                    ]
                );
                $totalCoupons++;
            }
        }

        $this->command->info("Created {$totalCoupons} store-specific coupons for demo version.");
    }

    private function createMainVersionStoreCoupons()
    {
        $store = Store::whereHas('user', function($query) {
            $query->where('email', 'company@example.com');
        })->first();

        if (!$store) {
            $this->command->error('No store found for company@example.com');
            return;
        }

        $randomCount = rand(5, 9);
        $coupons = array_slice($this->getAllCoupons($store->id), 0, $randomCount);
        
        foreach ($coupons as $couponData) {
            StoreCoupon::firstOrCreate(
                ['code' => $couponData['code'], 'store_id' => $store->id],
                [
                    'name' => $couponData['name'],
                    'description' => $couponData['description'],
                    'code_type' => 'manual',
                    'type' => $couponData['type'],
                    'discount_amount' => $couponData['discount_amount'],
                    'minimum_spend' => $couponData['minimum_spend'],
                    'maximum_spend' => $couponData['maximum_spend'] ?? null,
                    'use_limit_per_coupon' => $couponData['use_limit_per_coupon'],
                    'use_limit_per_user' => $couponData['use_limit_per_user'],
                    'used_count' => 0,
                    'start_date' => now(),
                    'expiry_date' => now()->addMonths(3),
                    'status' => true,
                    'store_id' => $store->id,
                    'created_by' => $store->user->id,
                ]
            );
        }

        $this->command->info('Created ' . count($coupons) . ' store coupons for main version.');
    }

    private function getAllCoupons($storeId): array
    {
        $suffix = 'S' . $storeId;
        
        return [
            [
                'name' => 'Store Welcome Offer',
                'code' => 'WELCOME' . $suffix,
                'description' => 'Welcome discount for new customers',
                'type' => 'flat',
                'discount_amount' => 15.00,
                'minimum_spend' => 50.00,
                'use_limit_per_coupon' => 100,
                'use_limit_per_user' => 1,
            ],
            [
                'name' => 'Store Loyalty Discount',
                'code' => 'LOYAL20' . $suffix,
                'description' => '20% off for loyal customers',
                'type' => 'percentage',
                'discount_amount' => 20.00,
                'minimum_spend' => 75.00,
                'maximum_spend' => 500.00,
                'use_limit_per_coupon' => 50,
                'use_limit_per_user' => 2,
            ],
            [
                'name' => 'Free Shipping Coupon',
                'code' => 'SHIP' . $suffix,
                'description' => 'Free shipping on any order',
                'type' => 'flat',
                'discount_amount' => 9.99,
                'minimum_spend' => 25.00,
                'use_limit_per_coupon' => 200,
                'use_limit_per_user' => 3,
            ],
            [
                'name' => 'Flash Sale Discount',
                'code' => 'FLASH30' . $suffix,
                'description' => '30% off flash sale discount',
                'type' => 'percentage',
                'discount_amount' => 30.00,
                'minimum_spend' => 100.00,
                'maximum_spend' => 300.00,
                'use_limit_per_coupon' => 25,
                'use_limit_per_user' => 1,
            ],
            [
                'name' => 'Bulk Order Discount',
                'code' => 'BULK50' . $suffix,
                'description' => '$50 off on bulk orders',
                'type' => 'flat',
                'discount_amount' => 50.00,
                'minimum_spend' => 200.00,
                'use_limit_per_coupon' => 30,
                'use_limit_per_user' => 2,
            ],
            [
                'name' => 'Weekend Special',
                'code' => 'WKND15' . $suffix,
                'description' => '15% weekend special offer',
                'type' => 'percentage',
                'discount_amount' => 15.00,
                'minimum_spend' => 60.00,
                'maximum_spend' => 400.00,
                'use_limit_per_coupon' => 75,
                'use_limit_per_user' => 3,
            ],
            [
                'name' => 'First Purchase Bonus',
                'code' => 'FIRST25' . $suffix,
                'description' => '$25 off first purchase',
                'type' => 'flat',
                'discount_amount' => 25.00,
                'minimum_spend' => 100.00,
                'use_limit_per_coupon' => 150,
                'use_limit_per_user' => 1,
            ],
            [
                'name' => 'VIP Customer Deal',
                'code' => 'VIP35' . $suffix,
                'description' => '35% VIP customer exclusive',
                'type' => 'percentage',
                'discount_amount' => 35.00,
                'minimum_spend' => 150.00,
                'maximum_spend' => 800.00,
                'use_limit_per_coupon' => 20,
                'use_limit_per_user' => 1,
            ],
            [
                'name' => 'Holiday Season Sale',
                'code' => 'HOLIDAY40' . $suffix,
                'description' => '$40 off holiday season',
                'type' => 'flat',
                'discount_amount' => 40.00,
                'minimum_spend' => 120.00,
                'use_limit_per_coupon' => 80,
                'use_limit_per_user' => 2,
            ],
        ];
    }
}