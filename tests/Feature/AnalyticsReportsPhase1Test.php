<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\AnalyticsService;
use App\Support\AnalyticsPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AnalyticsReportsPhase1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /* ───────────────────────── helpers ───────────────────────── */

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
            'customer_email' => 'totest@example.com', 'customer_phone' => '0592000000', 'customer_first_name' => 'Test', 'customer_last_name' => 'Buyer',
            'shipping_address' => 'Nablus', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'Nablus', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
            'created_at' => now(),
        ], $overrides));
    }

    private function makeProduct(Store $store, string $name): Product
    {
        return Product::create([
            'store_id' => $store->id, 'name' => $name, 'price' => 100, 'stock' => 10, 'is_active' => true,
        ]);
    }

    private function makeItem(Order $order, Product $product, array $attrs): OrderItem
    {
        return OrderItem::create(array_merge([
            'order_id' => $order->id, 'product_id' => $product->id, 'product_name' => $product->name,
            'product_price' => 100, 'quantity' => 1, 'unit_price' => 100, 'total_price' => 100, 'inventory_mode' => 'product',
        ], $attrs));
    }

    private function overview(int $storeId, array $period): array
    {
        return app(AnalyticsService::class)->overview($storeId, $period, 'ILS');
    }

    /* ─────────────────────── canonical metrics ─────────────────────── */

    public function test_overview_metrics_follow_canonical_financial_definitions(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 50, 'payment_status' => 'pending', 'status' => 'pending']);  // GMV + Pending (cod)
        $this->makeOrder($store, ['total_amount' => 100, 'payment_status' => 'paid', 'paid_at' => now()]);      // GMV + Collected
        $this->makeOrder($store, ['total_amount' => 200, 'status' => 'cancelled', 'payment_status' => 'pending']); // nothing
        $this->makeOrder($store, ['total_amount' => 300, 'payment_method' => 'stripe', 'payment_status' => 'pending', 'status' => 'pending']); // GMV, no Pending (online in-flight)

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(450, $o['metrics']['gmv']['primary'], 'GMV = 50+100+300 (cancelled excluded)');
        $this->assertEquals(100, $o['metrics']['collected']['primary'], 'collected = paid only');
        $this->assertEquals(50, $o['metrics']['pending_collection']['primary'], 'pending = offline pending only (stripe excluded)');
        $this->assertEquals(3, $o['metrics']['valid_orders']['current']);
        $this->assertEquals(1, $o['metrics']['cancelled_orders']['current']);
        $this->assertEquals(150, $o['metrics']['aov']['primary'], 'AOV = 450 / 3');
    }

    public function test_currencies_presented_separately_never_mixed(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'currency' => 'ILS', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 50, 'currency' => 'JOD', 'payment_status' => 'paid', 'paid_at' => now()]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $groups = collect($o['metrics']['gmv']['groups'])->keyBy('code');
        $this->assertEquals(100, $groups['ILS']['amount']);
        $this->assertEquals(50, $groups['JOD']['amount']);
        $this->assertCount(2, $o['metrics']['gmv']['groups']);
    }

    public function test_empty_store_overview_is_display_safe(): void
    {
        [$user, $store] = $this->companyWithStore();
        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(0, $o['metrics']['gmv']['primary']);
        $this->assertEquals(0, $o['metrics']['valid_orders']['current']);
        $this->assertEquals(0, $o['metrics']['aov']['primary']);
        // no NaN, no division by zero blow-up
        $this->assertTrue((float) $o['metrics']['gmv']['primary'] === 0.0);
        $this->assertFalse(is_nan((float) $o['metrics']['aov']['primary']));
        // previous zero period is safe ("New" state, no crash)
        $this->assertNull($o['metrics']['gmv']['change']['change']);
        $this->assertFalse((bool) $o['metrics']['gmv']['change']['is_new']);
        $this->assertSame(0, $o['new_vs_returning']['new_orders']);
        // full bucket labels are still emitted so the chart keeps its x-axis,
        // but every series is a safe zero
        $this->assertCount(30, $o['trend']['labels']);
        $this->assertSame(array_fill(0, 30, 0.0), array_values($o['trend']['valid_value']));
        $this->assertSame(array_fill(0, 30, 0.0), array_values($o['trend']['collected']));
        $this->assertSame(array_fill(0, 30, 0), array_values($o['trend']['orders']));
    }

    public function test_zero_previous_period_marks_is_new_not_crash(): void
    {
        [$user, $store] = $this->companyWithStore();
        // only current-period data, nothing in the previous window
        $this->makeOrder($store, ['total_amount' => 50, 'created_at' => now()]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(50, $o['metrics']['gmv']['primary']);
        $this->assertTrue($o['metrics']['gmv']['change']['is_new'], 'previous == 0 with current > 0 is a New state');
        $this->assertEquals(1, $o['metrics']['valid_orders']['current']);
    }

    public function test_store_timezone_day_boundaries_are_honored(): void
    {
        [$user, $store] = $this->companyWithStore();
        $tz = 'Asia/Hebron';
        $now = CarbonImmutable::parse('2026-09-03 12:00:00', $tz);

        $period = (new AnalyticsPeriod($tz, $now))->resolve('today');

        // 23:30 local belongs to "today"; 00:30 local belongs to tomorrow.
        $late = CarbonImmutable::parse('2026-09-03 23:30:00', $tz);
        $earlyTomorrow = CarbonImmutable::parse('2026-09-04 00:30:00', $tz);
        $this->makeOrder($store, ['total_amount' => 100, 'created_at' => $late]);
        $this->makeOrder($store, ['total_amount' => 500, 'created_at' => $earlyTomorrow]);

        $o = $this->overview($store->id, $period);
        $this->assertEquals(100, $o['metrics']['gmv']['primary'], 'tomorrow morning must not be counted in today');

        // hourly trend buckets contain only today's value
        $this->assertEquals('hour', $o['trend']['granularity']);
        $this->assertEquals(100, array_sum($o['trend']['valid_value']));
        $this->assertEquals(24, count($o['trend']['valid_value']), 'a local day has 24 hourly buckets');
    }

    public function test_late_local_day_orders_are_not_dropped_from_today_reports(): void
    {
        [$user, $store] = $this->companyWithStore();
        $tz = 'Asia/Hebron';

        // Regression: order timestamps are stored as literal app-local wall-clock
        // (config('app.timezone'), not UTC). Previously AnalyticsPeriod converted
        // the "today"/"last 30 days" upper bound to UTC (e.g. 2026-09-03T21:00Z),
        // so any order created after 21:00 local silently vanished from reports
        // ending on "today" until the clock rolled past the next midnight.
        $now = CarbonImmutable::parse('2026-09-03 23:05:00', $tz);
        $this->makeOrder($store, ['total_amount' => 471, 'created_at' => $now]);

        $today = $this->overview(
            $store->id,
            (new AnalyticsPeriod($tz, $now))->resolve('today')
        );
        $this->assertEquals(471, $today['metrics']['gmv']['primary'], '23:05 local must count on today');
        $this->assertEquals(1, $today['metrics']['valid_orders']['current']);

        $month = $this->overview(
            $store->id,
            (new AnalyticsPeriod($tz, $now))->resolve('last_30_days')
        );
        $this->assertEquals(471, $month['metrics']['gmv']['primary'], '23:05 local must count on last_30_days');
        $this->assertEquals(1, $month['metrics']['valid_orders']['current']);
    }

    /* ─────────────────────────── products ─────────────────────────── */

    public function test_top_products_merge_variants_and_exclude_terminal_orders(): void
    {
        [$user, $store] = $this->companyWithStore();
        $p1 = $this->makeProduct($store, 'Product One');

        $valid = $this->makeOrder($store, ['status' => 'delivered', 'payment_status' => 'paid', 'total_amount' => 550, 'created_at' => now()]);
        $this->makeItem($valid, $p1, ['quantity' => 2, 'total_price' => 200, 'product_price' => 100, 'unit_price' => 100]);
        $this->makeItem($valid, $p1, ['quantity' => 3, 'total_price' => 300, 'product_price' => 100, 'unit_price' => 100, 'product_variants' => '{"size":"L"}']);
        $snap = $this->makeProduct($store, 'Snapshot Item');
        $this->makeItem($valid, $snap, ['quantity' => 1, 'total_price' => 50, 'product_price' => 50, 'unit_price' => 50]);

        $cancelled = $this->makeOrder($store, ['status' => 'cancelled', 'payment_status' => 'pending', 'total_amount' => 400, 'created_at' => now()]);
        $this->makeItem($cancelled, $p1, ['quantity' => 5, 'total_price' => 400, 'product_price' => 80, 'unit_price' => 80]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $byQuantity = collect($o['top_products']['by_quantity']);
        $this->assertEquals('Product One', $byQuantity->first()['name']);
        $this->assertEquals(5, $byQuantity->first()['units'], 'two variants merge into one product; cancelled excluded');
        $this->assertEquals(2, $byQuantity->count());

        $byValue = collect($o['top_products']['by_value']);
        $this->assertEquals('Product One', $byValue->first()['name']);
        $this->assertEquals(500, $byValue->first()['primary'], 'cancelled order value excluded');
    }

    public function test_product_performance_pagination_and_search(): void
    {
        [$user, $store] = $this->companyWithStore();
        $order = $this->makeOrder($store, ['total_amount' => 200, 'created_at' => now()]);
        $a = $this->makeProduct($store, 'Alpha Widget');
        $b = $this->makeProduct($store, 'Beta Gadget');
        $this->makeItem($order, $a, ['quantity' => 2, 'total_price' => 200, 'unit_price' => 100]);
        $this->makeItem($order, $b, ['quantity' => 1, 'total_price' => 100, 'unit_price' => 100]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $service = app(AnalyticsService::class);

        $page = $service->productPerformance($store->id, $period, 'ILS', '', 1, 1);
        $this->assertSame(2, $page['pagination']['total']);
        $this->assertSame(2, $page['pagination']['last_page']);
        $this->assertCount(1, $page['products']);
        $this->assertEquals('Alpha Widget', $page['products'][0]['name']);

        $search = $service->productPerformance($store->id, $period, 'ILS', 'gadget', 1, 10);
        $this->assertSame(1, $search['pagination']['total']);
        $this->assertEquals('Beta Gadget', $search['products'][0]['name']);

        // avg price = primary revenue / units
        $this->assertEquals(100.0, $search['products'][0]['avg_price']);
    }

    /* ─────────────────────────── customers ─────────────────────────── */

    public function test_customer_flow_new_vs_returning_uses_canonical_valid_rule(): void
    {
        [$user, $store] = $this->companyWithStore();

        // returning: ordered before the period window, and again inside it
        $this->makeOrder($store, ['customer_phone' => '0592000000', 'status' => 'delivered', 'payment_status' => 'paid', 'created_at' => now()->subDays(45)]);
        $this->makeOrder($store, ['customer_phone' => '0592000000', 'status' => 'delivered', 'payment_status' => 'paid', 'created_at' => now()]);

        // new: first-ever valid order inside the window (plus a cancelled order that must not count)
        $this->makeOrder($store, ['customer_phone' => '0592111111', 'status' => 'delivered', 'payment_status' => 'paid', 'created_at' => now()]);
        $this->makeOrder($store, ['customer_phone' => '0592111111', 'status' => 'cancelled', 'payment_status' => 'pending', 'created_at' => now()]);

        // canonical registered customer, no orders yet — counts toward total customers only
        Customer::create(['store_id' => $store->id, 'first_name' => 'Ahmad', 'last_name' => 'Eyad', 'email' => 'a@b.com', 'phone' => '0593333333', 'is_active' => true]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $this->assertEquals(1, $o['new_vs_returning']['new_orders'], 'only the first-ever valid order is a new-customer order');
        $this->assertEquals(1, $o['new_vs_returning']['returning_orders']);
        $this->assertEquals(1, $o['new_vs_returning']['new_customers']);
        $this->assertEquals(1, $o['new_vs_returning']['returning_customers']);

        // total customers counts the registered customer (no orders) plus the two guest identities
        $this->assertEquals(3, $o['metrics']['total_customers']['current']);
        $this->assertEquals(1, $o['metrics']['repeat_customers']['current'], 'repeat = identity with >= 2 valid orders');
    }

    public function test_payment_method_breakdown_groups_canonical_families(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'status' => 'delivered', 'total_amount' => 100, 'created_at' => now()]);
        $this->makeOrder($store, ['payment_method' => 'bank', 'payment_status' => 'paid', 'paid_at' => now(), 'status' => 'delivered', 'total_amount' => 200, 'created_at' => now()]);
        $this->makeOrder($store, ['payment_method' => 'stripe', 'payment_status' => 'paid', 'paid_at' => now(), 'status' => 'delivered', 'total_amount' => 300, 'created_at' => now()]);
        $this->makeOrder($store, ['payment_method' => 'whatsapp', 'payment_status' => 'pending', 'status' => 'delivered', 'total_amount' => 40, 'created_at' => now()]);
        $this->makeOrder($store, ['payment_method' => 'stripe', 'payment_status' => 'pending', 'status' => 'cancelled', 'total_amount' => 999, 'created_at' => now()]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($store->id, $period);

        $byFamily = collect($o['payment_method_breakdown'])->keyBy('method');
        $this->assertEquals(['cod', 'bank', 'online', 'offline_other'], collect($o['payment_method_breakdown'])->pluck('method')->all());
        $this->assertEquals(1, $byFamily['cod']['orders']);
        $this->assertEquals(1, $byFamily['online']['orders'], 'cancelled stripe excluded');
        $this->assertEquals(300, $byFamily['online']['collected_primary']);
        $this->assertEquals(200, $byFamily['bank']['valid_value_primary']);
    }

    /* ─────────────────────────── tenancy / routes ─────────────────────────── */

    public function test_tenant_isolation_between_stores(): void
    {
        [$userA, $storeA] = $this->companyWithStore();
        [$userB, $storeB] = $this->companyWithStore();
        $this->makeOrder($storeA, ['total_amount' => 55, 'customer_phone' => '0592000000', 'created_at' => now()]);
        $this->makeOrder($storeB, ['total_amount' => 555, 'customer_phone' => '0592000000', 'created_at' => now()]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = $this->overview($storeA->id, $period);
        $this->assertEquals(55, $o['metrics']['gmv']['primary']);
        $this->assertEquals(1, $o['metrics']['valid_orders']['current']);
        $this->assertEquals(1, $o['metrics']['total_customers']['current'], 'store B customers never leak into store A');
    }

    public function test_analytics_page_requires_permission_and_renders_for_owner(): void
    {
        [$user, $store] = $this->companyWithStore();
        $res = $this->actingAs($user)->getJson(route('analytics.index'));
        $this->assertContains($res->getStatusCode(), [200], 'owner with manage-analytics can open analytics');

        // a company user without the manage-analytics permission is forbidden
        $userNoPerm = User::factory()->create(['type' => 'company', 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $res2 = $this->actingAs($userNoPerm)->getJson(route('analytics.index'));
        $this->assertContains($res2->getStatusCode(), [403, 302]);
    }

    /* ─────────────────────────── exports ─────────────────────────── */

    public function test_sales_csv_export_includes_bom_and_escapes_formula_injection(): void
    {
        [$user, $store] = $this->companyWithStore();
        $product = $this->makeProduct($store, '=HYPERLINK("http://evil")');
        $order = $this->makeOrder($store, ['total_amount' => 100, 'created_at' => now()]);
        $this->makeItem($order, $product, ['quantity' => 1, 'total_price' => 100, 'unit_price' => 100]);

        $res = $this->actingAs($user)->get(route('analytics.export', ['preset' => 'last_30_days']));
        $res->assertOk();
        $content = $res->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content, 'CSV has UTF-8 BOM');
        $this->assertStringContainsString("'=HYPERLINK", $content, 'formula cells are neutralised with a leading quote');
    }

    public function test_custom_range_validation_and_max_window(): void
    {
        // inverted range is rejected
        try {
            (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', '2026-09-10', '2026-09-01');
            $this->fail('inverted custom range must throw');
        } catch (\InvalidArgumentException) {
            $this->assertTrue(true);
        }

        // oversized window is rejected
        try {
            (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', '2024-01-01', '2026-09-01');
            $this->fail('oversized custom range must throw');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('366', $e->getMessage());
        }

        // malformed date is rejected
        try {
            (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', 'not-a-date', '2026-09-01');
            $this->fail('malformed date must throw');
        } catch (\InvalidArgumentException) {
            $this->assertTrue(true);
        }
    }
}
