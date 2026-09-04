<?php

namespace Tests\Feature;

use App\Models\CodPayment;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\PosTerminal;
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
 * POS CHECKOUT SIMPLIFICATION — cash at register = paid automatically.
 *
 * Business rule: For NEW POS sales, payment_method = 'cash' MUST automatically
 * result in payment_status = 'paid' regardless of any legacy client-supplied
 * cash_collected field. The server is authoritative.
 *
 * Applies to BOTH entry points:
 *   1. /pos        (merchant-operated)
 *   2. /pos/terminal (dedicated cashier terminal)
 *
 * Does NOT mutate historical orders. Does NOT change ecommerce behavior.
 */
class PosCheckoutSimplificationTest extends TestCase
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
        $plan = Plan::factory()->create(['name' => 'PCS' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
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

    private function makeProduct(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 8,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variant_combinations' => [],
        ], $overrides));
    }

    private function createTerminalAs(User $owner, string $username = 'cashier-test', string $pin = '1234'): PosTerminal
    {
        $this->actingAs($owner)->post(route('pos.terminals.store'), [
            'name' => 'Main Cashier',
            'username' => $username,
            'pin' => $pin,
        ]);
        return PosTerminal::where('store_id', $owner->current_store)->where('username', $username)->firstOrFail();
    }

    /* ───────────────────────── A — MERCHANT POS CASH ───────────────────────── */

    public function test_a_merchant_pos_cash_is_always_paid_collected(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['price' => 100, 'stock' => 8]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
        );

        $this->assertSame('pos', $order->order_source);
        $this->assertSame('cash', $order->payment_method);
        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);

        // Stock: 8 → 7
        $this->assertSame(7, (int) $p->fresh()->stock, 'stock must decrement exactly once');

        // Exactly one inventory movement.
        $movements = InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->count();
        $this->assertSame(1, $movements, 'exactly one movement for one POS sale');

        // Revenue counted exactly once.
        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(100.0, (float) $summary['collected_total'], 'revenue +100 exactly once');

        // NOT COD.
        $this->assertFalse(PaymentFinancialMetrics::orderIsCod($order), 'POS cash is never COD');
        $this->assertFalse(app(PaymentOperationsData::class)->row($order)['can_collect_cod'], 'no Collect COD action');
        $this->assertSame(0, CodPayment::where('order_id', $order->id)->count(), 'no CodPayment record');
    }

    /* ───────────────────────── B — TERMINAL POS CASH ───────────────────────── */

    public function test_b_terminal_pos_cash_is_always_paid_collected(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'cashier-test', '1234');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['price' => 100, 'stock' => 8]);

        $this->actingAs($terminal, 'pos_terminal');
        $res = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(201);

        $order = Order::where('order_source', 'pos')->orderByDesc('id')->first();
        $this->assertSame('paid', $order->payment_status, 'terminal POS cash is always paid');
        $this->assertNotNull($order->paid_at);

        // Stock: 8 → 7
        $this->assertSame(7, (int) $p->fresh()->stock);

        // Exactly one movement.
        $movements = InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->count();
        $this->assertSame(1, $movements);

        // Revenue exactly once.
        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(100.0, (float) $summary['collected_total']);

        // NOT COD.
        $this->assertFalse(PaymentFinancialMetrics::orderIsCod($order));
        $this->assertFalse(app(PaymentOperationsData::class)->row($order)['can_collect_cod']);

        // Terminal attribution.
        $this->assertSame($terminal->id, (int) $order->pos_terminal_id);
        $this->assertSame('cashier-test', $order->pos_cashier_username);
    }

    /* ───────────────────────── C — STALE CLIENT PAYLOAD ───────────────────────── */

    public function test_c_stale_client_cash_collected_false_overridden_by_server(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'stale-client', '1234');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['price' => 100, 'stock' => 8]);

        $this->actingAs($terminal, 'pos_terminal');
        $res = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'cash_collected' => false, // stale client sending false
        ]);
        $res->assertStatus(201);

        $order = Order::where('order_source', 'pos')->orderByDesc('id')->first();
        $this->assertSame('paid', $order->payment_status, 'server overrides stale cash_collected=false to paid');
        $this->assertNotNull($order->paid_at);
    }

    public function test_c2_service_level_override_cash_collected_false(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['price' => 100]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            false, // legacy param — server overrides for POS cash
        );

        $this->assertSame('paid', $order->payment_status, 'service-level override: POS cash is always paid');
    }

    /* ───────────────────────── D — ECOMMERCE COD PRESERVED ───────────────────────── */

    public function test_d_ecommerce_cod_still_works(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);

        $codOrder = Order::forceCreate([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'session_id' => 'sess-' . uniqid(),
            'status' => 'pending', 'payment_status' => 'pending', 'payment_method' => 'cod', 'order_source' => 'storefront',
            'customer_email' => 'c@example.com', 'customer_phone' => '0599000000', 'customer_first_name' => 'T', 'customer_last_name' => 'U',
            'shipping_address' => 'A', 'shipping_city' => 'Nablus', 'shipping_state' => 'WB', 'shipping_country' => 'PS',
            'billing_address' => 'A', 'billing_city' => 'Nablus', 'billing_state' => 'WB', 'billing_country' => 'PS',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
        ]);

        $this->assertSame('storefront', $codOrder->order_source);
        $this->assertTrue(PaymentFinancialMetrics::orderIsCod($codOrder), 'ecommerce COD is still COD');
        $this->assertTrue(app(PaymentOperationsData::class)->row($codOrder)['can_collect_cod'], 'Collect COD action still available');

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(1, $summary['cod_pending_count'], 'ecommerce COD still counts in COD due');
    }

    /* ───────────────────────── E — NON-CASH POS PRESERVED ───────────────────────── */

    public function test_e_non_cash_pos_methods_still_pending(): void
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
            $this->assertFalse(PaymentFinancialMetrics::orderIsCod($order), "POS {$method} is never COD");
        }
    }

    /* ───────────────────────── F — HISTORICAL DATA NOT MUTATED ───────────────────────── */

    public function test_f_no_historical_data_mutation(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);

        // Simulate a historical POS cash order that was intentionally created as pending.
        $historical = Order::forceCreate([
            'order_number' => 'ORD-TEST-HISTORICAL', 'store_id' => $store->id, 'session_id' => 'sess-hist',
            'status' => 'delivered', 'payment_status' => 'pending', 'payment_method' => 'cash', 'order_source' => 'pos',
            'customer_email' => 'pos-walkin-' . $store->id . '@local', 'customer_phone' => null,
            'customer_first_name' => 'زبون مباشر', 'customer_last_name' => '',
            'shipping_address' => 'In-Store', 'shipping_city' => '', 'shipping_state' => '', 'shipping_country' => '',
            'billing_address' => 'In-Store', 'billing_city' => '', 'billing_state' => '', 'billing_country' => '',
            'subtotal' => 50, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 50, 'currency' => 'ILS',
        ]);

        // Run any new migration or artisan command — historical must stay unchanged.
        $this->artisan('migrate', ['--force' => true]);

        $historical->refresh();
        $this->assertSame('pending', $historical->payment_status, 'historical POS cash order must NOT be mutated');
    }

    /* ───────────────────────── G — INVENTORY EXACTLY ONCE ───────────────────────── */

    public function test_g_product_stock_decremented_exactly_once(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['stock' => 8]);

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
        );

        $this->assertSame(7, (int) $p->fresh()->stock);
        $this->assertSame(1, InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->count());
    }

    public function test_g2_variant_stock_decremented_exactly_once(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);

        $p = Product::factory()->create([
            'store_id' => $store->id,
            'name' => 'Variant Shirt',
            'sku' => 'VS',
            'is_active' => true,
            'price' => 50,
            'stock' => 0,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'variant',
            'variant_combinations' => [
                ['id' => 'V1', 'uuid' => 'uuid-v1', 'values' => ['Red'], 'sku' => 'VS-R', 'price' => 50, 'stock' => 6],
            ],
        ]);

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'variant_id' => 'V1', 'quantity' => 1]],
            'cash',
        );

        $p->refresh();
        $variantStock = $p->variant_combinations[0]['stock'] ?? null;
        $this->assertSame(5, (int) $variantStock, 'variant stock decremented from 6 to 5');
        $this->assertSame(1, InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->count());
    }

    /* ───────────────────────── H — PAYMENTS HUB ───────────────────────── */

    public function test_h_pos_cash_not_in_cod_due_counted_as_collected(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['price' => 100]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
        );

        $summary = PaymentFinancialMetrics::summary($store->id);

        // NOT in COD due.
        $this->assertSame(0, $summary['cod_pending_count'], 'POS cash not in COD due');
        $this->assertFalse(app(PaymentOperationsData::class)->row($order)['can_collect_cod'], 'no Collect COD action');

        // Counted as collected.
        $this->assertSame(100.0, (float) $summary['collected_total'], 'counted as collected');
    }

    /* ───────────────────────── I — ANALYTICS ───────────────────────── */

    public function test_i_one_100_ils_sale_revenue_plus_100_once(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['price' => 100]);

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
        );

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertSame(100.0, (float) $summary['collected_total'], 'revenue +100 exactly once, not 0, not 200');

        // Verify no double counting: collected must be a single currency entry.
        $this->assertCount(1, $summary['collected'], 'exactly one collected currency group');
    }

    /* ───────────────────────── J — TERMINAL ATTRIBUTION PRESERVED ───────────────────────── */

    public function test_j_terminal_attribution_preserved_with_cash_simplification(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'attr-test', '1234');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['stock' => 5]);

        $this->actingAs($terminal, 'pos_terminal');
        $res = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(201);

        $order = Order::where('order_source', 'pos')->orderByDesc('id')->first();
        $this->assertSame($terminal->id, (int) $order->pos_terminal_id, 'terminal ID saved');
        $this->assertSame('attr-test', $order->pos_cashier_username, 'cashier username saved');
        $this->assertSame('pos', $order->order_source, 'order_source = pos');
    }

    /* ───────────────────────── K — MERCHANT POS ATTRIBUTION ───────────────────────── */

    public function test_k_merchant_pos_no_terminal_attribution(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store);

        $res = $this->postJson(route('pos.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(201);

        $order = Order::where('order_source', 'pos')->orderByDesc('id')->first();
        $this->assertNull($order->pos_terminal_id, 'merchant POS has no terminal attribution');
        $this->assertNull($order->pos_cashier_username, 'merchant POS has no cashier attribution');
        $this->assertSame('paid', $order->payment_status, 'merchant POS cash is paid');
    }

    /* ───────────────────────── L — NO DOUBLE DECREMENT ───────────────────────── */

    public function test_l_no_double_inventory_decrement(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->actingAs($owner);
        $p = $this->makeProduct($store, ['stock' => 8]);

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 3]],
            'cash',
        );

        // Stock must be exactly 8 - 3 = 5, not something else.
        $this->assertSame(5, (int) $p->fresh()->stock, 'no double decrement');
        // Movement count must be exactly 1.
        $this->assertSame(1, InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->count());
    }
}
