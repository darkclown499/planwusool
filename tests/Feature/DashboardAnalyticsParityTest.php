<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\AnalyticsService;
use App\Services\PaymentFinancialMetrics;
use App\Support\AnalyticsPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * B2-04 Analytics Metric + Label Parity.
 *
 * Pins the approved canonical financial contract (GMV / AOV / Sales Trend /
 * Product Units / Collected / Refunded / Net) across the merchant Dashboard,
 * the Analytics page, Payment Operations and the exports. Every assertion
 * below guards one contract guarantee; gross figures must never be labelled
 * or computed as "net revenue".
 */
class DashboardAnalyticsParityTest extends TestCase
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
            'customer_email' => 'parity@example.com', 'customer_phone' => '0592000000', 'customer_first_name' => 'Parity', 'customer_last_name' => 'Buyer',
            'shipping_address' => 'Nablus', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'Nablus', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
            'paid_at' => null, 'refunded_amount' => 0, 'refunded_at' => null,
            'created_at' => now(),
        ], $overrides));
    }

    private function makeProduct(Store $store, string $name = 'Parity Product')
    {
        return \App\Models\Product::create(['store_id' => $store->id, 'name' => $name, 'price' => 50, 'stock' => 10, 'is_active' => true]);
    }

    private function makeItem(Order $order, $product, int $quantity, float $price = 50): void
    {
        \App\Models\OrderItem::create([
            'order_id' => $order->id, 'product_id' => $product->id, 'product_name' => $product->name,
            'product_price' => $price, 'quantity' => $quantity, 'unit_price' => $price,
            'total_price' => $price * $quantity, 'inventory_mode' => 'product',
        ]);
    }

    private function dashboardFor(User $user): array
    {
        // An Inertia XHR GET is rejected with 409 until the client proves it
        // runs the current asset version. Resolve the version the middleware
        // computed (available after the first pass) and send it back.
        for ($attempts = 0; $attempts < 2; $attempts++) {
            $headers = ['X-Inertia' => 'true'];
            $version = (string) \Inertia\Inertia::getVersion();
            if ($version !== '') {
                $headers['X-Inertia-Version'] = $version;
            }
            $res = $this->actingAs($user)->getJson(route('dashboard'), $headers);
            if ($res->status() !== 409) {
                break;
            }
        }
        $res->assertOk();

        return (array) (json_decode($res->getContent(), true)['props']['dashboardData'] ?? []);
    }

    private function analytics(int $storeId, string $preset = 'last_30_days'): array
    {
        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve($preset);

        return app(AnalyticsService::class)->overview($storeId, $period, 'ILS');
    }

    private function summaryTotal(int $storeId, array $overrides = []): float
    {
        $summary = PaymentFinancialMetrics::summary($storeId, $overrides['from'] ?? null, $overrides['to'] ?? null);

        return (float) $summary['collected_total'];
    }

    public function test_dashboard_revenue_is_canonical_collected_and_matches_analytics(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 999, 'status' => 'cancelled', 'payment_status' => 'paid']);
        $this->makeOrder($store, ['total_amount' => 888, 'status' => 'failed', 'payment_status' => 'paid']);

        $dash = $this->dashboardFor($user);
        $this->assertEquals(100, $dash['metrics']['revenue'], 'dashboard revenue == canonical collected (terminal statuses never inflate)');
        $this->assertEquals(1, array_sum(array_column($dash['salesChart'] ?? [], 'orders')), 'dashboard sales trend counts only valid orders');

        $o = $this->analytics($store->id);
        $this->assertEquals(100, $o['metrics']['collected']['primary'], 'collected parity with analytics');
        $this->assertEquals(100, $o['metrics']['gmv']['primary'], 'gross GMV parity with analytics');

        $s = PaymentFinancialMetrics::summary($store->id);
        $this->assertEquals(100, $s['collected_total'], 'collected parity with payment operations');
        $this->assertEquals(100, $s['gmv_total'], 'GMV parity with payment operations');
    }

    public function test_dashboard_monthly_revenue_buckets_collected_by_paid_at(): void
    {
        [$user, $store] = $this->companyWithStore();
        // Booked last month but physically collected this month => collected this month.
        $this->makeOrder($store, [
            'total_amount' => 200, 'status' => 'delivered', 'payment_status' => 'paid',
            'paid_at' => now(), 'created_at' => now()->startOfMonth()->subDay(),
        ]);

        $dash = $this->dashboardFor($user);
        $this->assertEquals(200, $dash['metrics']['monthlyRevenue'], 'monthly revenue buckets by paid_at, not created_at');

        $from = now()->startOfMonth();
        $this->assertEquals(200, $this->summaryTotal($store->id, ['from' => $from, 'to' => $from->copy()->endOfMonth()]), 'monthly collected matches PaymentFinancialMetrics for the same window');
    }

    public function test_fully_refunded_order_stays_in_gross_and_is_refunded_net_zero(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, [
            'total_amount' => 100, 'status' => 'refunded', 'payment_status' => 'paid',
            'paid_at' => now(), 'refunded_amount' => 100, 'refunded_at' => now(),
        ]);

        $o = $this->analytics($store->id);
        $this->assertEquals(100, $o['metrics']['gmv']['primary'], 'fully refunded order remains a gross booking in GMV');
        $this->assertEquals(100, $o['metrics']['collected']['primary'], 'refunded order was still collected');
        $this->assertEquals(100, $o['metrics']['refunded']['primary'], 'refunded figures as its own metric');
        $this->assertEquals(0, $o['metrics']['net_collected']['primary'], 'net = collected - refunded = 0');

        $s = PaymentFinancialMetrics::summary($store->id);
        $this->assertEquals(100, $s['collected_total']);
        $this->assertEquals(100, $s['refunded_total']);
        $this->assertEquals(0, $s['net_collected_total']);
        $this->assertNotEquals($s['gmv_total'], $s['net_collected_total'], 'gross bookings are never collapsed into the net figure');
    }

    public function test_net_subtracts_refunded_from_collected(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, [
            'total_amount' => 100, 'status' => 'delivered', 'payment_status' => 'paid',
            'paid_at' => now(), 'refunded_amount' => 30, 'refunded_at' => now(),
        ]);

        $o = $this->analytics($store->id);
        $this->assertEquals(30, $o['metrics']['refunded']['primary']);
        $this->assertEquals(100, $o['metrics']['collected']['primary']);
        $this->assertEquals(70, $o['metrics']['net_collected']['primary'], 'net parity: collected - refunded');

        $s = PaymentFinancialMetrics::summary($store->id);
        $this->assertEquals(70, $s['net_collected_total']);
        $this->assertEqualsWithDelta($s['collected_total'] - $s['refunded_total'], $s['net_collected_total'], 0.001);
    }

    public function test_dashboard_top_products_use_gross_units_and_exclude_terminal_orders(): void
    {
        [$user, $store] = $this->companyWithStore();
        $product = $this->makeProduct($store, 'Widget');
        $valid = $this->makeOrder($store, ['total_amount' => 100, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $cancelled = $this->makeOrder($store, ['total_amount' => 999, 'status' => 'cancelled', 'payment_status' => 'pending']);
        $this->makeItem($valid, $product, 5);
        $this->makeItem($cancelled, $product, 9);

        $dash = $this->dashboardFor($user);
        $this->assertCount(1, $dash['topProducts'], 'cancelled-order items never create a phantom product');
        $this->assertEquals(5, (int) $dash['topProducts'][0]['sold'], 'product units are gross bookings from valid orders only');
    }

    public function test_multicurrency_figures_never_collapse_currencies(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'currency' => 'ILS', 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 50, 'currency' => 'JOD', 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);

        $dash = $this->dashboardFor($user);
        $this->assertEquals(100, $dash['metrics']['revenue'], 'dashboard reports the primary currency only — never a wrong cross-currency collapse');

        $o = $this->analytics($store->id);
        $codes = collect($o['metrics']['gmv']['groups'])->pluck('code')->sort()->values()->all();
        $this->assertEquals(['ILS', 'JOD'], $codes, 'analytics keeps every currency as its own group');
        $this->assertEquals(100, $o['metrics']['gmv']['primary']);
        $jod = collect($o['metrics']['gmv']['groups'])->first(fn ($g) => $g['code'] === 'JOD');
        $this->assertEquals(50, $jod['amount']);

        $s = PaymentFinancialMetrics::summary($store->id);
        $this->assertEquals(150, $s['gmv_total'], 'cross-currency total exists only as the per-currency map sum, never a silently merged figure');
    }

    public function test_store_timezone_period_parity_between_dashboard_chart_and_analytics(): void
    {
        [$user, $store] = $this->companyWithStore();
        // Booked outside the window but collected (paid_at) inside => collected now.
        $this->makeOrder($store, ['total_amount' => 300, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now(), 'created_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 900, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()->subDays(20), 'created_at' => now()->subDays(40)]);

        $dash = $this->dashboardFor($user);
        $chartTotal = array_sum(array_column($dash['revenueChart'] ?? [], 'revenue'));
        $this->assertEquals(1200, $chartTotal, 'dashboard chart buckets collected by paid_at within the store-local 30-day window');

        $o = $this->analytics($store->id);
        $this->assertEquals(1200, $o['metrics']['collected']['primary']);
        $this->assertEquals(1200, array_sum($o['trend']['collected']), 'analytics trend collected parity');

        $this->assertEquals(1200, $this->summaryTotal($store->id, ['from' => now()->subDays(29), 'to' => now()]), 'payment operations parity for the same store-local window');
    }

    public function test_analytics_export_includes_refunded_and_net_rows(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, [
            'total_amount' => 100, 'status' => 'delivered', 'payment_status' => 'paid',
            'paid_at' => now(), 'refunded_amount' => 30, 'refunded_at' => now(),
        ]);

        $res = $this->actingAs($user)->get(route('analytics.export', ['preset' => 'last_30_days']));
        $res->assertOk();
        $content = $res->streamedContent();

        $this->assertStringContainsString('refunded,30,0,ILS', $content, 'export surfaces the Refunded metric');
        $this->assertStringContainsString('net_collected,70,0,ILS', $content, 'export surfaces Net = Collected - Refunded');
    }

    public function test_dashboard_and_analytics_respect_tenant_isolation(): void
    {
        [$userA, $storeA] = $this->companyWithStore();
        [$userB, $storeB] = $this->companyWithStore();
        $this->makeOrder($storeA, ['total_amount' => 55, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($storeB, ['total_amount' => 555, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);

        $dash = $this->dashboardFor($userA);
        $this->assertEquals(55, $dash['metrics']['revenue'], 'store A dashboard never sees store B money');

        $o = $this->analytics($storeA->id);
        $this->assertEquals(55, $o['metrics']['collected']['primary']);
        $this->assertEquals(55, $o['metrics']['gmv']['primary']);
        $this->assertEquals(1, $o['metrics']['valid_orders']['current']);

        $s = PaymentFinancialMetrics::summary($storeA->id);
        $this->assertEquals(55, $s['collected_total']);
    }

    public function test_net_definition_holds_across_all_canonical_sources(): void
    {
        [$user, $store] = $this->companyWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 40, 'status' => 'delivered', 'payment_status' => 'paid', 'paid_at' => now(), 'refunded_amount' => 40, 'refunded_at' => now()]);

        $o = $this->analytics($store->id);
        $this->assertEqualsWithDelta(
            $o['metrics']['collected']['primary'] - $o['metrics']['refunded']['primary'],
            $o['metrics']['net_collected']['primary'],
            0.001,
            'analytics Net = Collected - Refunded'
        );

        $s = PaymentFinancialMetrics::summary($store->id);
        $this->assertEqualsWithDelta($s['collected_total'] - $s['refunded_total'], $s['net_collected_total'], 0.001, 'payment operations Net = Collected - Refunded');
        $this->assertEqualsWithDelta($o['metrics']['net_collected']['primary'], $s['net_collected_total'], 0.001, 'Net parity between analytics and payment operations');
    }
}