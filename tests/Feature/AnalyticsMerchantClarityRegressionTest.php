<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\AnalyticsService;
use App\Support\AnalyticsPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Regression tests that pin the merchant-facing analytics semantics used by
 * the "Analytics & Reports merchant UX + metrics clarity" task.
 *
 * These assert that the canonical read-model keeps the following guarantees:
 *  - financial totals never inflate on cancelled/failed/returned orders
 *  - "collected" only ever counts genuinely paid / physically collected money
 *  - POS cash collected counts as collected; pending POS cash & bank do not
 *  - no double counting between POS and online orders
 *  - a customer whose only orders are cancelled has zero valid spend
 *  - custom date ranges actually narrow the data
 */
class AnalyticsMerchantClarityRegressionTest extends TestCase
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
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 100, 'max_users_per_store' => 20]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'plan_id' => $plan->id, 'plan_is_active' => 1, 'plan_expire_date' => now()->addYear(), 'onboarded_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();
        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(Permission::all());
        $user->assignRole($role);
        foreach (Permission::all() as $p) {
            try {
                $user->givePermissionTo($p);
            } catch (\Throwable $e) {
            }
        }

        return [$user->fresh(), $store, $plan];
    }

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'customer_id' => null, 'session_id' => 'sess-' . uniqid(),
            'status' => 'delivered', 'payment_status' => 'paid', 'payment_method' => 'cod',
            'customer_email' => 'treq@example.com', 'customer_phone' => '0592000000', 'customer_first_name' => 'Req', 'customer_last_name' => 'Buyer',
            'shipping_address' => 'Nablus', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'Nablus', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
            'created_at' => now(),
        ], $overrides));
    }

    private function overview(int $storeId, array $period): array
    {
        return app(AnalyticsService::class)->overview($storeId, $period, 'ILS');
    }

    public function test_failed_orders_do_not_inflate_financial_totals(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 999, 'status' => 'failed', 'payment_status' => 'failed']);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(100, $o['metrics']['gmv']['primary'], 'failed order excluded from GMV');
        $this->assertEquals(100, $o['metrics']['collected']['primary'], 'failed order excluded from collected');
        $this->assertEquals(1, $o['metrics']['valid_orders']['current']);
    }

    public function test_pos_cash_collected_counts_as_collected(): void
    {
        [$user, $store] = $this->companyWithStore();
        // POS sale where the cashier physically collected cash at the register
        $this->makeOrder($store, [
            'order_source' => 'pos',
            'payment_method' => 'cash',
            'status' => 'delivered',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'total_amount' => 200,
        ]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(200, $o['metrics']['collected']['primary'], 'POS cash physically collected counts as collected');
        $this->assertEquals(200, $o['metrics']['gmv']['primary']);
        $this->assertEquals(0, $o['metrics']['pending_collection']['primary'], 'already-collected POS cash is not pending');
    }

    public function test_pos_pending_cash_does_not_count_as_collected(): void
    {
        [$user, $store] = $this->companyWithStore();
        // POS sale where cash was NOT physically collected yet
        $this->makeOrder($store, [
            'order_source' => 'pos',
            'payment_method' => 'cash',
            'status' => 'delivered',
            'payment_status' => 'pending',
            'total_amount' => 300,
        ]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(0, $o['metrics']['collected']['primary'], 'pending POS cash must not be collected');
        $this->assertEquals(300, $o['metrics']['pending_collection']['primary'], 'pending POS cash shows as pending receivable');
        $this->assertEquals(300, $o['metrics']['gmv']['primary'], 'POS still contributes valid order value');
    }

    public function test_pos_bank_pending_does_not_count_as_collected(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, [
            'order_source' => 'pos',
            'payment_method' => 'bank_transfer',
            'status' => 'delivered',
            'payment_status' => 'pending',
            'total_amount' => 400,
        ]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(0, $o['metrics']['collected']['primary'], 'pending POS bank transfer must not be collected');
        $this->assertEquals(400, $o['metrics']['pending_collection']['primary']);
    }

    public function test_no_double_counting_between_pos_and_online(): void
    {
        [$user, $store] = $this->companyWithStore();
        // one POS cash-collected order + one online order => 600 total value, 600 collected, no duplication
        $this->makeOrder($store, ['order_source' => 'pos', 'payment_method' => 'cash', 'payment_status' => 'paid', 'paid_at' => now(), 'total_amount' => 200]);
        $this->makeOrder($store, ['order_source' => 'online', 'payment_method' => 'stripe', 'payment_status' => 'paid', 'paid_at' => now(), 'total_amount' => 400]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(600, $o['metrics']['gmv']['primary']);
        $this->assertEquals(600, $o['metrics']['collected']['primary']);
        $this->assertEquals(2, $o['metrics']['valid_orders']['current']);
    }

    public function test_customer_with_only_cancelled_orders_has_zero_valid_spend(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone' => '0592001111', 'status' => 'cancelled', 'payment_status' => 'pending', 'total_amount' => 1000]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertCount(0, $o['top_customers'], 'cancelled-only customer must not appear with positive valid spend');
        $this->assertEquals(0, $o['new_vs_returning']['new_customers'], 'cancelled-only customer is not a valid new customer');
    }

    public function test_custom_date_range_narrows_data(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'created_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 200, 'created_at' => now()->subDays(40)]);

        // range covering only the last 10 days => only the 100 order
        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve(
            'custom',
            CarbonImmutable::now()->subDays(10)->format('Y-m-d'),
            CarbonImmutable::now()->format('Y-m-d')
        );
        $o = $this->overview($store->id, $period);

        $this->assertEquals(100, $o['metrics']['gmv']['primary']);
        $this->assertEquals(1, $o['metrics']['valid_orders']['current']);
    }
}

