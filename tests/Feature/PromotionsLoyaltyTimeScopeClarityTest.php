<?php

namespace Tests\Feature;

use App\Models\AdvancedCoupon;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Store;
use App\Models\StoreCoupon;
use App\Models\User;
use App\Services\PromotionAnalyticsService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * P4B3-03 — promotion / coupon / loyalty metric time-scope clarity.
 *
 * The merchant-facing promotion and loyalty dashboards show transactional
 * metrics that are ALL-TIME (lifetime) aggregates. They must never be
 * mistaken for a selected/short window:
 *
 *  - coupon "Usage Statistics" (Times Used, Total Savings, Unique Users,
 *    Avg. Savings per Use) are lifetime totals; "Usage (Last 30 Days)" is the
 *    ONLY period metric and must use the store's configured timezone with
 *    calendar-day boundaries (the same AnalyticsPeriod semantics Reports use).
 *  - promotion Uses / Discounted rows and analytics cards are lifetime totals.
 *  - loyalty Earned / Redeemed / Customers Participating are lifetime totals.
 *  - every store-scoped aggregate must not leak across tenant boundaries.
 *
 * Contracts pinned here:
 *  - coupon show total_usage/total_savings/unique_users ignore order age
 *  - coupon show recent_usage uses a store-timezone calendar 30-day window
 *    (a 30th-day order is excluded, unlike the old rolling 30x24h window)
 *  - changing the store timezone moves the recent-usage boundary accordingly
 *  - promotion overall / forPromotion aggregate lifetime usage across valid
 *    orders only and stay fully store-scoped
 *  - loyalty transaction stats are lifetime and store-scoped
 *  - the shipped UI labels lifetime values with the new "All time" scope
 *    marker (ar: "كل الفترات", en: "All time")
 *
 * Frontend label contracts are asserted against shipped source + language
 * files (same approach as MarketingToolsPolishTest / ArabicTerminologyTest).
 */
class PromotionsLoyaltyTimeScopeClarityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function companyWithStore(): array
    {
        $plan = Plan::factory()->create([
            'name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all'],
            'max_stores' => 10, 'max_products_per_store' => 100, 'max_users_per_store' => 20,
        ]);

        $user = User::factory()->create([
            'type' => 'company', 'email_verified_at' => now(),
            'plan_id' => $plan->id, 'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(), 'onboarded_at' => now(),
        ]);

        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();

        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(Permission::all());
        $user->assignRole($role);
        foreach (Permission::all() as $permission) {
            try {
                $user->givePermissionTo($permission);
            } catch (\Throwable $e) {
                // permission may already be granted via role
            }
        }

        return [$user->fresh(), $store, $plan];
    }

    private function storeCoupon(Store $store, string $code): StoreCoupon
    {
        return StoreCoupon::create([
            'store_id' => $store->id,
            'name' => 'Coupon ' . $code,
            'code' => $code,
            'type' => 'percentage',
            'discount_amount' => 10,
            'status' => true,
        ]);
    }

    private function customer(Store $store): Customer
    {
        return Customer::create([
            'store_id' => $store->id, 'first_name' => 'F', 'last_name' => 'L',
            'email' => 'c' . uniqid() . '@t.test', 'password' => bcrypt('x'),
            'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    private function order(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'customer_id' => null,
            'session_id' => 'sess-' . uniqid(), 'status' => 'delivered', 'payment_status' => 'paid',
            'payment_method' => 'cod', 'order_source' => 'online',
            'customer_email' => 'buyer@example.com', 'customer_phone' => '0592111111',
            'customer_first_name' => 'Buyer', 'customer_last_name' => 'One',
            'shipping_address' => 'Nablus', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'Nablus', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0,
            'total_amount' => 100, 'currency' => 'ILS', 'created_at' => now(),
        ], $overrides));
    }

    private function promotion(array $overrides = []): AdvancedCoupon
    {
        return AdvancedCoupon::create(array_merge([
            'store_id' => 1,
            'name' => 'Promo',
            'code_type' => 'manual',
            'code' => strtoupper('C' . uniqid()),
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'status' => true,
        ], $overrides));
    }

    public function test_coupon_show_lifetime_metrics_ignore_order_age(): void
    {
        [$user, $store] = $this->companyWithStore();
        Carbon::setTestNow(CarbonImmutable::parse('2026-03-15 12:00:00', config('app.timezone')));

        $coupon = $this->storeCoupon($store, 'LIFETIME1');
        $customerA = $this->customer($store);
        $customerB = $this->customer($store);

        // one recent order, one ordered ~29 days ago (inside the last-30 window),
        // one ~60 days ago (outside the window): lifetime counts must include all three
        $this->order($store, [
            'customer_id' => $customerA->id, 'coupon_code' => $coupon->code, 'coupon_discount' => 10,
            'total_amount' => 90, 'created_at' => '2026-03-10 09:00:00',
        ]);
        $this->order($store, [
            'customer_id' => $customerA->id, 'coupon_code' => $coupon->code, 'coupon_discount' => 15,
            'total_amount' => 85, 'created_at' => '2026-02-14 23:59:00',
        ]);
        $this->order($store, [
            'customer_id' => $customerB->id, 'coupon_code' => $coupon->code, 'coupon_discount' => 20,
            'total_amount' => 80, 'created_at' => '2026-01-14 23:59:00',
        ]);

        $this->actingAs($user)
            ->get(route('coupon-system.show', $coupon->id))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('coupon-system/show')
                ->where('stats.total_usage', 3)
                ->where('stats.total_savings', 45)
                ->where('stats.unique_users', 2)
                ->where('stats.avg_savings_per_use', 15)
                ->where('stats.recent_usage', 2));
    }

    public function test_coupon_show_recent_usage_uses_calendar_30_day_window(): void
    {
        [$user, $store] = $this->companyWithStore();
        Carbon::setTestNow(CarbonImmutable::parse('2026-03-15 12:00:00', config('app.timezone')));

        $coupon = $this->storeCoupon($store, 'CAL30');

        // exactly 30 days ago at 12:00 — the OLD rolling now()->subDays(30)
        // window would include it; the calendar last-30-days window starts on
        // the 00:00 boundary of day -29, so it must be excluded
        $this->order($store, [
            'coupon_code' => $coupon->code, 'coupon_discount' => 5, 'created_at' => '2026-02-13 12:00:00',
        ]);
        $this->order($store, [
            'coupon_code' => $coupon->code, 'coupon_discount' => 5, 'created_at' => '2026-02-14 12:00:00',
        ]);

        $this->actingAs($user)
            ->get(route('coupon-system.show', $coupon->id))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('coupon-system/show')
                ->where('stats.total_usage', 2)
                ->where('stats.recent_usage', 1));
    }

    public function test_coupon_show_recent_usage_boundary_follows_store_timezone(): void
    {
        [$userA, $storeA] = $this->companyWithStore();
        [$userB, $storeB] = $this->companyWithStore();
        Carbon::setTestNow(CarbonImmutable::parse('2026-03-15 23:00:00', config('app.timezone')));

        $appTz = config('app.timezone', 'Asia/Hebron');

        // Sanity: a few minutes before local midnight, the 29-days-ago instant
        // lands on a later calendar day in Tokyo than it does store-locally,
        // so the Tokyo boundary must be a later (larger) wall-clock string.
        $astFrom = CarbonImmutable::parse('2026-03-15 23:00:00', $appTz)->subDays(29)->setTimezone($appTz)->startOfDay();
        $tokyoFrom = CarbonImmutable::parse('2026-03-15 23:00:00', $appTz)->subDays(29)->setTimezone('Asia/Tokyo')->startOfDay();
        $this->assertGreaterThan($astFrom->format('Y-m-d H:i:s'), $tokyoFrom->format('Y-m-d H:i:s'));

        // An order recorded on the first morning of store-local day -29 —
        // included for the default store-locally-resolved window, but before
        // midnight day -29 in Tokyo, so excluded once the store switches tz.
        $ambiguousOrderTime = $astFrom->addHours(12)->format('Y-m-d H:i:s');
        $this->assertLessThan($tokyoFrom->format('Y-m-d H:i:s'), $ambiguousOrderTime);

        $couponA = $this->storeCoupon($storeA, 'TZA');
        $couponB = $this->storeCoupon($storeB, 'TZB');

        // store A: merchant operates in Tokyo time — boundary bumps to Tokyo day -29
        Setting::setSetting('defaultTimezone', 'Asia/Tokyo', $userA->id, $storeA->id);
        $this->order($storeA, ['coupon_code' => $couponA->code, 'coupon_discount' => 5, 'created_at' => $ambiguousOrderTime]);

        // store B: default store timezone — boundary stays store-local
        $this->order($storeB, ['coupon_code' => $couponB->code, 'coupon_discount' => 5, 'created_at' => $ambiguousOrderTime]);

        $this->actingAs($userA)
            ->get(route('coupon-system.show', $couponA->id))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('coupon-system/show')
                ->where('stats.total_usage', 1)
                ->where('stats.recent_usage', 0));

        $this->actingAs($userB)
            ->get(route('coupon-system.show', $couponB->id))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('coupon-system/show')
                ->where('stats.total_usage', 1)
                ->where('stats.recent_usage', 1));
    }

    public function test_promotion_overall_is_lifetime_and_store_scoped(): void
    {
        [$userA, $storeA] = $this->companyWithStore();
        [$userB, $storeB] = $this->companyWithStore();

        $promoA = $this->promotion(['store_id' => $storeA->id]);
        $promoB = $this->promotion(['store_id' => $storeB->id]);
        $customerA = $this->customer($storeA);
        $customerB = $this->customer($storeB);

        $deliveredA = $this->order($storeA, ['customer_id' => $customerA->id, 'total_amount' => 100]);
        $cancelledA = $this->order($storeA, ['customer_id' => $customerA->id, 'status' => 'cancelled', 'total_amount' => 999]);
        $deliveredB = $this->order($storeB, ['customer_id' => $customerB->id, 'total_amount' => 200]);

        $promoA->recordUsage(['order_id' => $deliveredA->id, 'customer_id' => $customerA->id, 'customer_identifier' => $customerA->email, 'discount_amount' => 10]);
        $promoA->recordUsage(['order_id' => $cancelledA->id, 'customer_id' => $customerA->id, 'customer_identifier' => $customerA->email, 'discount_amount' => 50]);
        $promoB->recordUsage(['order_id' => $deliveredB->id, 'customer_id' => $customerB->id, 'customer_identifier' => $customerB->email, 'discount_amount' => 20]);

        $service = app(PromotionAnalyticsService::class);

        // store A: only the delivered usage counts; the cancelled one is excluded
        // (all-time, no date filter)
        $overallA = $service->overall($storeA->id);
        $this->assertSame(1, $overallA['total_promotions']);
        $this->assertSame(1, $overallA['total_uses']);
        $this->assertSame(10.0, $overallA['total_discount_granted']);
        $this->assertSame(100.0, $overallA['valid_order_value']);

        // store B must never see store A's promotion usage (tenant isolation)
        $overallB = $service->overall($storeB->id);
        $this->assertSame(1, $overallB['total_promotions']);
        $this->assertSame(1, $overallB['total_uses']);
        $this->assertSame(20.0, $overallB['total_discount_granted']);
        $this->assertSame(200.0, $overallB['valid_order_value']);
    }

    public function test_promotion_for_promotion_uses_have_no_date_filter(): void
    {
        [$user, $store] = $this->companyWithStore();

        $promo = $this->promotion(['store_id' => $store->id]);
        $customer = $this->customer($store);

        // a usage tied to an order older than any reporting window still counts
        $this->order($store, ['customer_id' => $customer->id, 'created_at' => '2025-01-10 10:00:00']);
        $oldOrder = $this->order($store, [
            'customer_id' => $customer->id, 'total_amount' => 700, 'created_at' => '2025-01-10 10:00:00',
        ]);
        $promo->recordUsage(['order_id' => $oldOrder->id, 'customer_id' => $customer->id, 'customer_identifier' => $customer->email, 'discount_amount' => 70]);

        $metrics = app(PromotionAnalyticsService::class)->forPromotion($promo->fresh());

        $this->assertSame(1, $metrics['uses']);
        $this->assertSame(70.0, $metrics['total_discount_granted']);
        $this->assertSame(700.0, $metrics['valid_order_value']);
    }

    public function test_loyalty_transactions_stats_are_lifetime_and_store_scoped(): void
    {
        [$userA, $storeA] = $this->companyWithStore();
        [$userB, $storeB] = $this->companyWithStore();

        $customerA1 = $this->customer($storeA);
        $customerA2 = $this->customer($storeA);
        $customerB1 = $this->customer($storeB);

        // store A: earned 150 lifetime (incl. a 100-days-old transaction),
        // redeemed 30, from 2 customers
        LoyaltyTransaction::forceCreate([
            'store_id' => $storeA->id, 'customer_id' => $customerA1->id, 'type' => 'earn',
            'points' => 100, 'balance_after' => 100, 'description' => 'old', 'created_at' => now()->subDays(100),
        ]);
        LoyaltyTransaction::create([
            'store_id' => $storeA->id, 'customer_id' => $customerA2->id, 'type' => 'earn',
            'points' => 50, 'balance_after' => 150, 'description' => 'recent',
        ]);
        LoyaltyTransaction::create([
            'store_id' => $storeA->id, 'customer_id' => $customerA1->id, 'type' => 'redeem',
            'points' => -30, 'balance_after' => 120, 'description' => 'redeemed',
        ]);

        // store B: earned 999, redeemed 10, 1 customer
        LoyaltyTransaction::create([
            'store_id' => $storeB->id, 'customer_id' => $customerB1->id, 'type' => 'earn',
            'points' => 999, 'balance_after' => 999, 'description' => 'earned',
        ]);
        LoyaltyTransaction::create([
            'store_id' => $storeB->id, 'customer_id' => $customerB1->id, 'type' => 'redeem',
            'points' => -10, 'balance_after' => 989, 'description' => 'redeemed',
        ]);

        $this->actingAs($userA)
            ->get(route('loyalty.transactions'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('loyalty/transactions')
                ->where('stats.total_points_earned', 150)
                ->where('stats.total_points_redeemed', 30)
                ->where('stats.total_customers', 2));

        $this->actingAs($userB)
            ->get(route('loyalty.transactions'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('loyalty/transactions')
                ->where('stats.total_points_earned', 999)
                ->where('stats.total_points_redeemed', 10)
                ->where('stats.total_customers', 1));
    }

    public function test_lifetime_surfaces_are_labeled_all_time_in_shipped_ui(): void
    {
        $lang = resource_path('lang');

        $this->assertStringContainsString('"All time": "كل الفترات"', file_get_contents($lang . '/ar.json'), 'Arabic translation must localize the scope marker');
        $this->assertStringContainsString('"All time": "All time"', file_get_contents($lang . '/en.json'), 'English translation must ship the same key');

        $analytics = file_get_contents(resource_path('js/pages/promotions/analytics.tsx'));
        $this->assertStringContainsString("{t('All time')}", $analytics, 'promotion analytics grid must be marked all-time');

        $index = file_get_contents(resource_path('js/pages/promotions/index.tsx'));
        $this->assertStringContainsString("{t('Uses')} ({t('All time')})", $index, 'promotion rows must label Uses as all-time');
        $this->assertStringContainsString("{t('Discounted')} ({t('All time')})", $index, 'promotion rows must label Discounted as all-time');

        $loyalty = file_get_contents(resource_path('js/pages/loyalty/transactions.tsx'));
        $this->assertStringContainsString("{t('All time')}", $loyalty, 'loyalty stats must be marked all-time');

        $couponShow = file_get_contents(resource_path('js/pages/coupon-system/show.tsx'));
        $this->assertStringContainsString("{t('All time')}", $couponShow, 'coupon usage statistics must be marked all-time');
    }
}