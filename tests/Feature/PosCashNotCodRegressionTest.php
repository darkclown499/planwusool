<?php

namespace Tests\Feature;

use App\Models\CodPayment;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\PaymentFinancialMetrics;
use App\Services\PaymentOperationsData;
use App\Services\PointOfSaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * REGRESSION — POS in-store cash/bank sales must NEVER be classified as COD.
 *
 * Business rule: POS cash + uncollected = method CASH + status PENDING/UNCOLLECTED
 * (never COD, no COD queue / due count / Collect button / settlement). POS cash +
 * collected = CASH + PAID (counted exactly once). Ecommerce COD (payment_method
 * 'cod', order_source 'storefront') must remain genuine COD.
 *
 * The discriminator is order_source = 'pos' (set only by PointOfSaleService). The
 * shared COD classification in PaymentFinancialMetrics deliberately keeps legacy
 * aliases ('cash', 'cash_on_delivery') in COD_METHODS for historical compatibility,
 * so ALL COD consumers must additionally exclude order_source = 'pos'.
 */
class PosCashNotCodRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /* ───────────────────────── helpers ───────────────────────── */

    private function companyUser(array $overrides = []): User
    {
        $plan = Plan::factory()->create(['name' => 'PC' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
        $user = User::factory()->create(array_merge([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ], $overrides));
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->forceFill(['current_store' => $store->id])->save();
        $role = \App\Models\Role::where('name', 'company')->where('guard_name', 'web')->first();
        if ($role && !$user->hasRole($role)) {
            $user->assignRole($role);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user;
    }

    private function allow(User $user, string ...$perms): User
    {
        foreach ($perms as $p) {
            if (!Permission::where('name', $p)->where('guard_name', 'web')->exists()) {
                Permission::create(['name' => $p, 'guard_name' => 'web']);
            }
            $user->givePermissionTo($p);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user->fresh();
    }

    private function makeProduct(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'is_active' => true,
            'price' => 10,
            'stock' => 50,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variant_combinations' => [],
        ], $overrides));
    }

    private function makeEcommerceOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'session_id' => 'sess-' . uniqid(),
            'status' => 'pending', 'payment_status' => 'pending', 'payment_method' => 'cod', 'order_source' => 'storefront',
            'customer_email' => 'c@example.com', 'customer_phone' => '0599000000', 'customer_first_name' => 'T', 'customer_last_name' => 'U',
            'shipping_address' => 'A', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'A', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
        ], $overrides));
    }

    /* ───────────────────────── POS cash — NEVER COD ───────────────────────── */

    public function test_pos_cash_uncollected_is_pending_and_never_cod(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            false, // cash NOT collected
        );

        $this->assertSame('pos', $order->order_source, 'POS sale must be attributed as order_source = pos');
        $this->assertSame('cash', $order->payment_method, 'POS cash payment method is CASH');
        $this->assertSame('pending', $order->payment_status, 'uncollected POS cash stays pending');

        $this->assertSame(0, CodPayment::where('order_id', $order->id)->count(), 'no COD tracking record for POS cash');

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(0, $summary['cod_pending_count'], 'uncollected POS cash must NOT count as COD due');

        $row = app(PaymentOperationsData::class)->row($order);
        $this->assertFalse($row['can_collect_cod'], 'no "Collect COD" action for POS cash');
    }

    public function test_pos_cash_collected_is_paid_counted_once_and_never_cod(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['price' => 10]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true, // cash physically collected
        );

        $this->assertSame('paid', $order->payment_status, 'collected POS cash is paid');
        $this->assertSame(0, PaymentFinancialMetrics::summary($store->id)['cod_pending_count']);
        $this->assertFalse(app(PaymentOperationsData::class)->row($order)['can_collect_cod']);

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(10.0, (float) $summary['collected_total'], 'collected POS cash revenue counted exactly once (10)');
        $this->assertSame(1, count($summary['collected']), 'exactly one collected-currency group, counted once');
    }

    public function test_pos_bank_and_bank_transfer_pending_never_cod(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store);

        foreach (['bank', 'bank_transfer'] as $method) {
            $order = app(PointOfSaleService::class)->createPosSale(
                $store->id,
                [['product_id' => $p->id, 'quantity' => 1]],
                $method,
            );
            $this->assertSame('pending', $order->payment_status, "POS {$method} stays pending");
            $this->assertFalse(app(PaymentOperationsData::class)->row($order)['can_collect_cod'], "POS {$method} is not COD");
        }

        $this->assertSame(0, PaymentFinancialMetrics::summary($store->id)['cod_pending_count']);
    }

    /* ───────────────────────── Ecommerce COD — still genuine COD ───────────────────────── */

    public function test_ecommerce_cod_is_still_genuine_cod(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $codOrder = $this->makeEcommerceOrder($store, ['payment_method' => 'cod', 'order_source' => 'storefront', 'total_amount' => 150]);

        $this->assertSame('storefront', $codOrder->order_source, 'ecommerce COD is not a POS order');

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(1, $summary['cod_pending_count'], 'real ecommerce COD still counts as COD due');

        $this->assertTrue(
            app(PaymentOperationsData::class)->row($codOrder)['can_collect_cod'],
            'real ecommerce COD order keeps the Collect COD action'
        );
    }

    public function test_legacy_cod_alias_preserved_for_non_pos_orders(): void
    {
        // Historical compatibility: a non-POS order whose legacy COD alias
        // ("cash_on_delivery") remains stored must STILL be treated as COD. Removing
        // that would silently drop real COD revenue/due — we only exclude order_source = 'pos'.
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $legacy = $this->makeEcommerceOrder($store, ['payment_method' => 'cash_on_delivery', 'order_source' => 'storefront', 'total_amount' => 90]);

        $this->assertSame(1, PaymentFinancialMetrics::summary($store->id)['cod_pending_count']);
        $this->assertTrue(app(PaymentOperationsData::class)->row($legacy)['can_collect_cod']);
    }

    /* ───────────────────────── Shared ledger / hub ───────────────────────── */

    public function test_hub_operations_ledger_separates_pos_cash_from_cod(): void
    {
        $owner = $this->companyUser();
        $this->allow($owner, 'manage-cod-payments', 'manage-orders');
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store);

        $posCash = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            false,
        );
        $ecommerceCod = $this->makeEcommerceOrder($store, ['payment_method' => 'cod', 'order_source' => 'storefront', 'total_amount' => 200]);

        $ledger = app(PaymentOperationsData::class)->ledger($store->id, ['payment_method' => 'cod']);
        $rows = collect($ledger->items());
        $posRow = $rows->firstWhere('order_number', $posCash->order_number);
        $codRow = $rows->firstWhere('order_number', $ecommerceCod->order_number);

        $this->assertNull($posRow, 'POS cash order must not appear in the COD payment-method filter');
        $this->assertNotNull($codRow, 'real ecommerce COD order appears in the COD filter');
        $this->assertTrue($codRow['can_collect_cod'], 'real COD row keeps Collect COD');

        // Full ledger (no filter) exposes both, but only the COD row is collectable.
        $all = collect(app(PaymentOperationsData::class)->ledger($store->id, [])->items());
        $this->assertFalse($all->firstWhere('order_number', $posCash->order_number)['can_collect_cod']);
        $this->assertTrue($all->firstWhere('order_number', $ecommerceCod->order_number)['can_collect_cod']);
    }

    /* ───────────────────────── Analytics family ───────────────────────── */

    public function test_analytics_groups_pos_cash_under_cash_family_not_cod(): void
    {
        $owner = $this->companyUser();
        $this->allow($owner, 'manage-analytics');
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store);

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true,
        );

        $res = $this->get(route('analytics.index'));
        $res->assertOk();
        $breakdown = $res->inertiaPage()['props']['analytics']['payment_method_breakdown'] ?? [];

        $cod = collect($breakdown)->firstWhere('method', 'cod');
        $cash = collect($breakdown)->firstWhere('method', 'cash');

        $this->assertNotNull($cash, 'POS cash must surface as its own cash family');
        $this->assertSame(1, (int) ($cash['orders'] ?? 0), 'the POS sale counts under the cash family');

        $this->assertNotNull($cod, 'cod family is still emitted');
        $this->assertSame(0, (int) ($cod['orders'] ?? -1), 'POS cash must NOT count inside the cod family');
    }
}
