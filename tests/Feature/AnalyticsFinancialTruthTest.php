<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\AnalyticsService;
use App\Services\OrderTransitionService;
use App\Services\PaymentFinancialMetrics;
use App\Support\AnalyticsPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Financial-truth reconciliation (Phase 4 / T3-A):
 *
 *  - orders.status schema admits the canonical `failed` lifecycle state
 *    (previously missing, so MySQL pre-strict coerced those writes to '').
 *  - legacy '' (coerced-failed) rows never inflate GMV / valid order count /
 *    AOV / trend / product units, on ANY driver (SQLite or MySQL).
 *  - `returned` is NOT an order lifecycle status, so the analytics status
 *    breakdown never surfaces a phantom `returned` slice and the transition
 *    machine cannot write `returned` into orders.status.
 *  - the canonical financial validity contract lives in PaymentFinancialMetrics
 *    and is reused by analytics instead of duplicating status strings.
 */
class AnalyticsFinancialTruthTest extends TestCase
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

    private function makeOrder(Store $store, array $overrides = []): \App\Models\Order
    {
        return \App\Models\Order::forceCreate(array_merge([
            'order_number' => \App\Models\Order::generateOrderNumber(), 'store_id' => $store->id, 'customer_id' => null, 'session_id' => 'sess-' . uniqid(),
            'status' => 'delivered', 'payment_status' => 'paid', 'payment_method' => 'cod',
            'customer_email' => 'truth@example.com', 'customer_phone' => '0592000000', 'customer_first_name' => 'Truth', 'customer_last_name' => 'Buyer',
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

    public function test_orders_status_enum_contract_includes_failed_not_returned(): void
    {
        [$user, $store] = $this->companyWithStore();

        // failed is a schema-valid lifecycle state via the canonical transition machine.
        $order = $this->makeOrder($store, ['status' => 'shipped', 'payment_status' => 'pending']);
        $fresh = OrderTransitionService::transition($order, OrderTransitionService::STATUS_FAILED);
        $this->assertSame('failed', $fresh->status, 'mark-failed transition persists the canonical failed state');

        // returned is NOT writable into orders.status via the canonical machine.
        $order2 = $this->makeOrder($store, ['status' => 'shipped', 'payment_status' => 'pending']);
        try {
            OrderTransitionService::transition($order2, 'returned');
            $this->fail('returned must not be a valid order transition');
        } catch (\Exception $e) {
            $this->assertStringContainsString('لا يمكن', $e->getMessage());
        }
        $this->assertNotSame('returned', $order2->fresh()->status);

        // The canonical status vocabularies agree with the schema contract.
        $this->assertContains('failed', PaymentFinancialMetrics::ORDER_STATUSES);
        $this->assertNotContains('returned', PaymentFinancialMetrics::ORDER_STATUSES);
        $this->assertNotContains('returned', OrderTransitionService::CANONICAL_STATUSES);
        $this->assertContains('failed', OrderTransitionService::CANONICAL_STATUSES);
    }

    public function test_legacy_empty_status_rows_are_excluded_from_all_financial_metrics(): void
    {
        [$user, $store] = $this->companyWithStore();
        // Simulate the real production artifact: MySQL pre-strict coerced a
        // 'failed' write to ''. SQLite accepts the literal '' so this exercises
        // the exact legacy payload regardless of driver.
        $this->makeOrder($store, ['total_amount' => 50, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 777, 'status' => '', 'payment_status' => 'failed']);
        $this->makeOrder($store, ['total_amount' => 888, 'status' => 'cancelled', 'payment_status' => 'pending']);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        // GMV / valid orders / AOV
        $this->assertEquals(50, $o['metrics']['gmv']['primary'], 'legacy empty-status order excluded from GMV');
        $this->assertEquals(1, $o['metrics']['valid_orders']['current'], 'legacy empty-status order excluded from order count');
        $this->assertEquals(50, $o['metrics']['aov']['primary']);

        // Collected
        $this->assertEquals(50, $o['metrics']['collected']['primary'], 'legacy empty-status order excluded from collected');

        // Trend
        $this->assertEquals(50, array_sum($o['trend']['valid_value']), 'legacy empty-status order excluded from trend');
        $this->assertEquals(1, array_sum($o['trend']['orders']), 'legacy empty-status order excluded from trend order count');

        // Product units/value
        $product = \App\Models\Product::create(['store_id' => $store->id, 'name' => 'W', 'price' => 50, 'stock' => 10, 'is_active' => true]);
        \App\Models\OrderItem::create(['order_id' => \App\Models\Order::where('store_id', $store->id)->where('status', 'delivered')->value('id'), 'product_id' => $product->id, 'product_name' => $product->name, 'product_price' => 50, 'quantity' => 1, 'unit_price' => 50, 'total_price' => 50, 'inventory_mode' => 'product']);
        \App\Models\OrderItem::create(['order_id' => \App\Models\Order::where('store_id', $store->id)->where('status', '')->value('id'), 'product_id' => $product->id, 'product_name' => $product->name, 'product_price' => 777, 'quantity' => 9, 'unit_price' => 777, 'total_price' => 777, 'inventory_mode' => 'product']);

        $o2 = $this->overview($store->id, $period);
        $byQty = collect($o2['top_products']['by_quantity']);
        $this->assertEquals(1, $byQty->first()['units'], 'units from legacy empty-status order excluded');
        $byVal = collect($o2['top_products']['by_value']);
        $this->assertEquals(50, $byVal->first()['primary'], 'value from legacy empty-status order excluded');
    }

    public function test_status_breakdown_surfaces_only_canonical_lifecycle_states(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 10, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 20, 'status' => 'failed', 'payment_status' => 'failed']);
        $this->makeOrder($store, ['total_amount' => 30, 'status' => '', 'payment_status' => 'failed']);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $statuses = collect($o['order_status_breakdown'] ?? [])->pluck('status')->all();
        // The breakdown is a canonical slice: delivered + failed appear, legacy '' and phantom 'returned' never do.
        $this->assertContains('delivered', $statuses);
        $this->assertContains('failed', $statuses);
        $this->assertNotContains('', $statuses);
        $this->assertNotContains('returned', $statuses);
    }

    public function test_financial_validity_contract_is_centralized_and_reused(): void
    {
        // The analytics exclusion and the canonical contract derive from one source.
        $this->assertSame(
            PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES,
            ['cancelled', 'failed', ''],
            'financial validity contract excludes cancelled + failed + legacy empty'
        );
        $this->assertNotContains('returned', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES, 'returned is not an order status');
        $this->assertNotContains('refunded', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES, 'refunded orders remain gross bookings in GMV (excluded from financial validity only when cancelled/failed)');
    }
}