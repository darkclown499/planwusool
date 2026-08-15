<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Coupon;
use App\Models\Store;
use App\Services\Plan\PlanService;
use App\Services\Plan\Pricing\PlanPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanServiceTest extends TestCase
{
    use RefreshDatabase;

    protected PlanService $planService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->planService = app(PlanService::class);
    }

    public function test_calculate_plan_pricing_without_coupon()
    {
        $plan = Plan::factory()->create([
            'price_monthly' => 29.99,
            'price_yearly' => 299.99,
        ]);

        $pricing = $this->planService->getPricingService()->calculate($plan, null, 'monthly');
        
        $this->assertEquals(29.99, $pricing['original_price']);
        $this->assertEquals(0, $pricing['discount_amount']);
        $this->assertEquals(29.99, $pricing['final_price']);
        $this->assertNull($pricing['coupon_id']);
    }

    public function test_calculate_plan_pricing_with_percentage_coupon()
    {
        $plan = Plan::factory()->create([
            'price_monthly' => 100,
            'price_yearly' => 1000,
        ]);

        $coupon = Coupon::factory()->create([
            'code' => 'SAVE20',
            'type' => 'percentage',
            'discount_amount' => 20,
            'status' => 1,
            'start_date' => now()->subDay(),
            'expiry_date' => now()->addMonth(),
        ]);

        $pricing = $this->planService->getPricingService()->calculate($plan, 'SAVE20', 'monthly');
        
        $this->assertEquals(100, $pricing['original_price']);
        $this->assertEquals(20, $pricing['discount_amount']);
        $this->assertEquals(80, $pricing['final_price']);
        $this->assertEquals($coupon->id, $pricing['coupon_id']);
    }

    public function test_calculate_plan_pricing_with_flat_coupon()
    {
        $plan = Plan::factory()->create([
            'price_monthly' => 100,
        ]);

        $coupon = Coupon::factory()->create([
            'code' => 'FLAT10',
            'type' => 'fixed',
            'discount_amount' => 10,
            'status' => 1,
        ]);

        $pricing = $this->planService->getPricingService()->calculate($plan, 'FLAT10', 'monthly');
        
        $this->assertEquals(100, $pricing['original_price']);
        $this->assertEquals(10, $pricing['discount_amount']);
        $this->assertEquals(90, $pricing['final_price']);
    }

    public function test_coupon_expiry_validation()
    {
        $plan = Plan::factory()->create(['price_monthly' => 100]);

        // Expired coupon
        $coupon = Coupon::factory()->create([
            'code' => 'EXPIRED',
            'type' => 'percentage',
            'discount_amount' => 20,
            'expiry_date' => now()->subDay(),
        ]);

        $pricing = $this->planService->getPricingService()->calculate($plan, 'EXPIRED', 'monthly');
        
        $this->assertEquals(100, $pricing['final_price']);
        $this->assertNull($pricing['coupon_id']);
    }

    public function test_assign_plan_to_user()
    {
        $user = User::factory()->create(['type' => 'company']);
        $plan = Plan::factory()->create(['is_default' => false]);

        $result = $this->planService->assignToUser($user, $plan, 'yearly');

        $this->assertTrue($result);
        $user->refresh();
        
        $this->assertEquals($plan->id, $user->plan_id);
        $this->assertEquals('yearly', $user->plan_duration);
        $this->assertTrue($user->plan_is_active);
        $this->assertFalse($user->is_trial);
    }

    public function test_plan_upgrade_reactivates_resources()
    {
        $user = User::factory()->create(['type' => 'company']);
        $oldPlan = Plan::factory()->create([
            'max_stores' => 1,
            'max_users_per_store' => 2,
            'max_products_per_store' => 10,
        ]);
        $newPlan = Plan::factory()->create([
            'max_stores' => 5,
            'max_users_per_store' => 10,
            'max_products_per_store' => 100,
        ]);

        $user->plan()->associate($oldPlan)->save();
        
        // Create inactive store
        $inactiveStore = Store::factory()->create([
            'user_id' => $user->id,
        ]);
        \App\Models\StoreConfiguration::updateOrCreate(
            ['store_id' => $inactiveStore->id, 'key' => 'store_status'],
            ['value' => 'false']
        );

        // Create inactive user
        $inactiveUser = User::factory()->create([
            'type' => 'user',
            'current_store' => $user->stores()->first()->id,
            'status' => 'inactive',
            'created_by' => $user->id,
        ]);

        // Create inactive product
        $inactiveProduct = \App\Models\Product::factory()->create([
            'store_id' => $user->stores()->first()->id,
            'is_active' => false,
        ]);

        // Upgrade plan
        $this->planService->assignToUser($user, $newPlan, 'yearly');

        // Verify reactivation
        $inactiveStore->refresh();
        $config = \App\Models\StoreConfiguration::getConfiguration($inactiveStore->id);
        $this->assertTrue($config['store_status'] ?? true);

        $inactiveUser->refresh();
        $this->assertEquals('active', $inactiveUser->status);

        $inactiveProduct->refresh();
        $this->assertTrue($inactiveProduct->is_active);
    }

    public function test_enforce_plan_limitations_deactivates_excess()
    {
        $user = User::factory()->create(['type' => 'company']);
        $plan = Plan::factory()->create([
            'max_stores' => 1,
            'max_users_per_store' => 2,
            'max_products_per_store' => 5,
        ]);
        
        $user->plan()->associate($plan)->save();

        // Create 3 stores (limit is 1)
        $stores = Store::factory()->count(3)->create(['user_id' => $user->id]);
        foreach ($stores as $store) {
            \App\Models\StoreConfiguration::updateOrCreate(
                ['store_id' => $store->id, 'key' => 'store_status'],
                ['value' => 'true']
            );
        }

        // Create 5 users (limit is 2)
        User::factory()->count(5)->create([
            'type' => 'user',
            'current_store' => $stores->first()->id,
            'created_by' => $user->id,
            'status' => 'active',
        ]);

        // Create 10 products (limit is 5)
        \App\Models\Product::factory()->count(10)->create([
            'store_id' => $stores->first()->id,
            'is_active' => true,
        ]);

        // Enforce limitations
        app(\App\Services\Plan\PlanService::class)->enforcePlanLimitations($user);

        // Verify only 1 store active
        $activeStores = $user->stores()->whereHas('configurations', function($q) {
            $q->where('key', 'store_status')->where('value', 'true');
        })->count();
        $this->assertEquals(1, $activeStores);

        // Verify only 2 users active per store
        $activeUsers = User::where('current_store', $stores->first()->id)
            ->where('type', '!=', 'company')
            ->where('status', 'active')
            ->count();
        $this->assertEquals(2, $activeUsers);

        // Verify only 5 products active per store
        $activeProducts = \App\Models\Product::where('store_id', $stores->first()->id)
            ->where('is_active', true)
            ->count();
        $this->assertEquals(5, $activeProducts);
    }

    public function test_coupon_usage_limit_enforcement()
    {
        $plan = Plan::factory()->create(['price_monthly' => 100]);
        $coupon = Coupon::factory()->create([
            'code' => 'LIMIT5',
            'type' => 'percentage',
            'discount_amount' => 20,
            'use_limit_per_coupon' => 2,
            'use_limit_per_user' => 1,
        ]);

        $user1 = User::factory()->create(['type' => 'company']);
        $user2 = User::factory()->create(['type' => 'company']);

        // User 1 uses coupon twice - second should fail
        $pricing1 = app(\App\Services\Plan\Pricing\PlanPricingService::class)->calculate($plan, 'LIMIT5', 'monthly', $user1->id);
        $this->assertEquals($coupon->id, $pricing1['coupon_id']);

        // Simulate first usage
        \App\Models\PlanOrder::create([
            'user_id' => $user1->id,
            'plan_id' => $plan->id,
            'coupon_id' => $coupon->id,
            'status' => 'approved',
        ]);

        $coupon->refresh();
        $this->assertEquals(1, $coupon->used_count);

        // Second usage should fail due to user limit
        $pricing2 = app(\App\Services\Plan\Pricing\PlanPricingService::class)->calculate($plan, 'LIMIT5', 'monthly', $user1->id);
        $this->assertNull($pricing2['coupon_id']);
    }
}