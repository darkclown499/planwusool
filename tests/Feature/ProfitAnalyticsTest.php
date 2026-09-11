<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\ManualOrderService;
use App\Services\OrderService;
use App\Services\PointOfSaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfitAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function merchantWithStore(): array
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();

        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-analytics', 'manage-orders', 'create-orders', 'view-orders'])->get();
        if ($perms->count() > 0) {
            $role->syncPermissions($perms);
            $user->assignRole($role);
        } else {
            $user->type = 'superadmin';
            $user->save();
        }
        return [$user, $store];
    }

    protected function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
    }

    protected function product(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $this->category($store)->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 50,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    protected function variantProduct(Store $store, array $overrides = []): Product
    {
        return $this->product($store, array_merge([
            'inventory_mode' => 'variant',
            'price' => 100,
            'variants' => [['name' => 'Color', 'values' => ['Red']], ['name' => 'Size', 'values' => ['S', 'M']]],
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'uuid-red-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => '', 'cost_price' => '40'],
                ['id' => 'Red‖M', 'uuid' => 'uuid-red-m', 'values' => ['Red', 'M'], 'label' => 'Red / M', 'price' => '110', 'stock' => '10', 'sku' => 'RED-M', 'image' => '', 'cost_price' => '45'],
            ],
            'stock' => 999,
        ], $overrides));
    }

    public function test_product_cost_price_is_nullable_and_rejects_negative(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);

        $valid = fn (array $extra = []) => array_merge([
            'name' => 'Cost Product',
            'price' => 50,
            'stock' => 10,
            'images' => 'path/to/img.jpg',
            'category_id' => $cat->id,
        ], $extra);

        $this->post(route('products.store'), $valid(['name' => 'No Cost', 'cost_price' => null]))
            ->assertSessionHasNoErrors();

        $this->from(route('products.create'))->post(route('products.store'), $valid(['name' => 'Bad Cost', 'cost_price' => -1]))
            ->assertSessionHasErrors('cost_price');
    }

    public function test_cost_price_for_variant_returns_product_cost_when_no_selection(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $p = $this->product($store, ['cost_price' => 30]);
        $this->assertSame(30.0, $p->costPriceForVariant(null));

        $noCost = $this->product($store, ['cost_price' => null]);
        $this->assertNull($noCost->costPriceForVariant(null));
    }

    public function test_variant_combo_cost_wins_then_product_cost_then_null(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $p = $this->variantProduct($store, ['cost_price' => 33]);
        $this->assertSame(45.0, $p->costPriceForVariant('Red‖M'), 'combo cost wins');
        $this->assertSame(40.0, $p->costPriceForVariant('Red‖S'), 'combo cost wins');

        // combo exists but has no cost -> product cost
        $p2 = $this->variantProduct($store, [
            'cost_price' => 33,
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'u-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
            ],
        ]);
        $this->assertSame(33.0, $p2->costPriceForVariant('Red‖S'), 'falls back to product cost');

        // neither cost present -> null
        $p3 = $this->variantProduct($store, [
            'cost_price' => null,
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'u-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
            ],
        ]);
        $this->assertNull($p3->costPriceForVariant('Red‖S'));
    }

    public function test_order_item_snapshots_product_cost_via_canonical_order_service(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, ['price' => 100, 'cost_price' => 60, 'stock' => 10]);

        $order = app(OrderService::class)->createOrder([
            'store_id' => $store->id,
            'customer_email' => 'a@b.com', 'customer_phone' => '0',
            'customer_first_name' => 'A', 'customer_last_name' => 'B',
            'shipping_address' => 'x', 'shipping_city' => 'y', 'shipping_state' => '', 'shipping_country' => '',
            'billing_address' => 'x', 'billing_city' => 'y', 'billing_state' => '', 'billing_country' => '',
            'subtotal' => 200, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 200,
            'payment_method' => 'cod', 'order_source' => 'storefront', 'currency' => 'ILS',
        ], [[
            'product_id' => $p->id, 'name' => $p->name, 'sku' => 'S', 'price' => 100, 'quantity' => 2, 'variants' => null,
            'unit_cost' => $p->costPriceForVariant(null),
        ]]);

        $this->assertSame(60.0, (float) OrderItem::firstWhere('order_id', $order->id)->unit_cost);
    }

    public function test_order_item_snapshots_variant_combo_cost(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, ['cost_price' => 33]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'variant_id' => 'Red‖M', 'quantity' => 1]],
            'payment_method' => 'cod', 'first_name' => 'M', 'last_name' => 'O', 'email' => 'm@o.com',
        ]);

        $this->assertSame(45.0, (float) OrderItem::firstWhere('order_id', $order->id)->unit_cost);
    }

    public function test_unknown_cost_is_snapshotted_as_null_not_zero(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, ['cost_price' => null]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod', 'first_name' => 'M', 'last_name' => 'O', 'email' => 'm@o.com',
        ]);

        $this->assertNull(OrderItem::firstWhere('order_id', $order->id)->unit_cost);
    }

    public function test_cost_snapshot_is_immutable_across_product_edits(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, ['cost_price' => 60]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod', 'first_name' => 'M', 'last_name' => 'O', 'email' => 'm@o.com',
        ]);

        $p->update(['cost_price' => 999]);
        $this->assertSame(60.0, (float) OrderItem::firstWhere('order_id', $order->id)->unit_cost);
    }

    public function test_cost_snapshot_survives_product_deletion(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, ['cost_price' => 60]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod', 'first_name' => 'M', 'last_name' => 'O', 'email' => 'm@o.com',
        ]);
        $p->delete();

        $item = OrderItem::firstWhere('order_id', $order->id);
        $this->assertNotNull($item);
        $this->assertNull($item->product_id);
        $this->assertSame(60.0, (float) $item->unit_cost);
    }

    protected function makeOrder(Store $store, array $attrs, array $items): Order
    {
        $order = Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'customer_email' => 't@t.com', 'customer_phone' => '0',
            'customer_first_name' => 'T', 'customer_last_name' => 'T',
            'shipping_address' => 'x', 'shipping_city' => 'y', 'shipping_state' => '', 'shipping_country' => '',
            'billing_address' => 'x', 'billing_city' => 'y', 'billing_state' => '', 'billing_country' => '',
            'subtotal' => 0, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 0,
            'currency' => 'ILS', 'payment_method' => 'cod', 'order_source' => 'storefront',
            'refunded_amount' => 0,
        ], $attrs));

        foreach ($items as $item) {
            OrderItem::create(array_merge([
                'order_id' => $order->id,
                'product_id' => null,
                'product_name' => 'P',
                'product_sku' => 'SKU',
                'product_price' => 0,
                'quantity' => 1,
                'unit_price' => 0,
                'total_price' => 0,
            ], $item));
        }

        return $order;
    }

    protected function period(): array
    {
        return (new \App\Support\AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
    }

    public function test_summary_computes_known_revenue_cogs_profit_and_coverage(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, [], [
            ['unit_price' => 100, 'total_price' => 200, 'quantity' => 2, 'unit_cost' => 60],
        ]);
        $this->makeOrder($store, [], [
            ['unit_price' => 50, 'total_price' => 50, 'quantity' => 1, 'unit_cost' => null],
        ]);

        $out = app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS');
        $s = collect($out['summary'])->firstWhere('code', 'ILS');

        $this->assertSame(200.0, $s['known_revenue']);
        $this->assertSame(50.0, $s['unknown_cost_revenue']);
        $this->assertSame(250.0, $s['total_revenue']);
        $this->assertSame(120.0, $s['cogs']);
        $this->assertSame(80.0, $s['gross_profit']);
        $this->assertSame(40.0, $s['gross_margin_pct']);
        $this->assertSame(80.0, $s['cost_coverage_pct']);
        $this->assertSame(1, $s['known_cost_orders']);
        $this->assertSame(2, $s['total_orders']);
    }

    public function test_margin_is_zero_when_no_known_revenue(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, [], [['unit_price' => 50, 'total_price' => 50, 'quantity' => 1, 'unit_cost' => null]]);

        $s = collect(app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['summary'])->firstWhere('code', 'ILS');
        $this->assertSame(0.0, $s['gross_margin_pct']);
        $this->assertSame(0.0, $s['cost_coverage_pct']);
        $this->assertNull($s['refund_adjusted_profit']);
    }

    public function test_cancelled_and_failed_orders_are_excluded(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, ['status' => 'cancelled'], [['total_price' => 999, 'unit_price' => 999, 'quantity' => 1, 'unit_cost' => 500]]);
        $this->makeOrder($store, ['status' => 'delivered'], [['total_price' => 100, 'unit_price' => 100, 'quantity' => 1, 'unit_cost' => 40]]);

        $s = collect(app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['summary'])->firstWhere('code', 'ILS');
        $this->assertSame(100.0, $s['known_revenue']);
        $this->assertSame(60.0, $s['gross_profit']);
    }

    public function test_currencies_are_grouped_and_never_mixed(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, ['currency' => 'ILS'], [['total_price' => 100, 'unit_price' => 100, 'quantity' => 1, 'unit_cost' => 40]]);
        $this->makeOrder($store, ['currency' => 'USD'], [['total_price' => 200, 'unit_price' => 200, 'quantity' => 1, 'unit_cost' => 120]]);

        $summary = app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['summary'];
        $ils = collect($summary)->firstWhere('code', 'ILS');
        $usd = collect($summary)->firstWhere('code', 'USD');
        $this->assertSame(100.0, $ils['known_revenue']);
        $this->assertSame(200.0, $usd['known_revenue']);
    }

    public function test_full_coverage_refund_is_subtracted_and_partial_is_excluded(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, ['refunded_amount' => 30, 'refunded_at' => now()], [
            ['total_price' => 100, 'unit_price' => 100, 'quantity' => 1, 'unit_cost' => 40],
        ]);
        $this->makeOrder($store, ['refunded_amount' => 25, 'refunded_at' => now()], [
            ['total_price' => 200, 'unit_price' => 200, 'quantity' => 1, 'unit_cost' => 100],
            ['total_price' => 50, 'unit_price' => 50, 'quantity' => 1, 'unit_cost' => null],
        ]);

        $s = collect(app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['summary'])->firstWhere('code', 'ILS');
        $this->assertSame(30.0, $s['attributable_refunds']);
        $this->assertSame(25.0, $s['excluded_refunds']);
        $this->assertSame('partial', $s['refund_state']);
        $this->assertSame(160.0, $s['gross_profit']);
        $this->assertSame(130.0, $s['refund_adjusted_profit']);
    }

    public function test_ranking_orders_by_gross_profit_not_revenue(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, [], [
            ['product_name' => 'HighRevenueLowMargin', 'total_price' => 1000, 'unit_price' => 1000, 'quantity' => 1, 'unit_cost' => 950],
            ['product_name' => 'LowRevenueHighMargin', 'total_price' => 300, 'unit_price' => 300, 'quantity' => 1, 'unit_cost' => 50],
        ]);

        $top = app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['top'];
        $this->assertSame('LowRevenueHighMargin', $top[0]['product_name'], 'ranked by gross profit');
        $this->assertSame(250.0, $top[0]['gross_profit']);
    }

    public function test_negative_margin_products_are_surfaced(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, [], [
            ['product_name' => 'Loss', 'total_price' => 100, 'unit_price' => 100, 'quantity' => 1, 'unit_cost' => 150],
        ]);

        $neg = app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['negative'];
        $this->assertCount(1, $neg);
        $this->assertSame('Loss', $neg[0]['product_name']);
        $this->assertSame(-50.0, $neg[0]['gross_profit']);
    }

    public function test_store_isolation_excludes_other_store_orders(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $otherUser = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now()]);
        $otherStore = Store::factory()->create(['user_id' => $otherUser->id, 'currency' => 'ILS']);

        $this->makeOrder($store, [], [['total_price' => 100, 'unit_price' => 100, 'quantity' => 1, 'unit_cost' => 40]]);
        $this->makeOrder($otherStore, [], [['total_price' => 777, 'unit_price' => 777, 'quantity' => 1, 'unit_cost' => 300]]);

        $s = collect(app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['summary'])->firstWhere('code', 'ILS');
        $this->assertSame(100.0, $s['known_revenue'], 'other store must not leak');
    }

    public function test_trend_has_one_point_per_bucket(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->makeOrder($store, [], [['total_price' => 100, 'unit_price' => 100, 'quantity' => 1, 'unit_cost' => 40]]);

        $trend = app(\App\Services\ProfitAnalyticsService::class)->overview($store->id, $this->period(), 'ILS')['trend'];
        $this->assertNotEmpty($trend['labels']);
        $this->assertCount(count($trend['labels']), $trend['gross_profit']);
        $this->assertSame(60.0, array_sum($trend['gross_profit']));
    }
}