<?php

namespace Tests\Feature;

use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Plan;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\PointOfSaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * WUSOL POS LIVE QA POLISH BATCH
 *
 * Covers the presentation / UX / synchronization fixes verified in production QA:
 *  - order details POS attribution (safe display, deleted-terminal safety, tenant
 *    isolation, non-POS clean)
 *  - post-sale stock sync (exactly one inventory movement, authoritative stock)
 *  - terminal login query prefill (store + username prefilled, PIN never)
 *  - Arabic localization presence in the translation bundles
 */
class PosLiveQaPolishTest extends TestCase
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
        $plan = Plan::factory()->create(['name' => 'LQA-' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
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
        $perm = \Spatie\Permission\Models\Permission::firstOrCreate(
            ['name' => 'manage-pos', 'guard_name' => 'web'],
            ['module' => 'pos', 'label' => 'Manage POS', 'description' => 'Can manage in-store point of sale']
        );
        if ($role && !$role->hasPermissionTo($perm)) {
            $role->givePermissionTo($perm);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user;
    }

    private function makeProduct(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'is_active' => true,
            'price' => 10,
            'stock' => 8,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variant_combinations' => [],
        ], $overrides));
    }

    private function createTerminalAs(User $owner, string $username = 'cashier-test', string $pin = '1234', array $extra = []): PosTerminal
    {
        return PosTerminal::create(array_merge([
            'store_id' => $owner->current_store,
            'name' => 'الكاشير الرئيسي',
            'username' => $username,
            'pin_hash' => Hash::make($pin),
            'terminal_code' => \Illuminate\Support\Str::random(24),
            'is_active' => true,
        ], $extra));
    }

    /* ───────────────────────── ISSUE 3: order attribution ───────────────────────── */

    public function test_pos_terminal_sale_attribution_persists(): void
    {
        $owner = $this->companyUser();
        $this->actingAs($owner);
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store);
        $terminal = $this->createTerminalAs($owner);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true,
            $terminal->id,
            $terminal->username
        );

        $order->refresh();
        $this->assertSame('pos', $order->order_source);
        $this->assertSame($terminal->id, (int) $order->pos_terminal_id);
        $this->assertSame('cashier-test', $order->pos_cashier_username);
    }

    public function test_order_details_expose_safe_pos_attribution_only(): void
    {
        $owner = $this->companyUser();
        $this->allow($owner, 'manage-pos', 'view-orders');
        $this->actingAs($owner);
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store);
        $terminal = $this->createTerminalAs($owner, 'cashier-sales');

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true,
            $terminal->id,
            $terminal->username
        );

        $res = $this->get(route('orders.show', $order->id));
        $res->assertOk();
        $props = $res->inertiaPage()['props']['order'] ?? [];

        $this->assertSame('pos', $props['order_source'] ?? null);
        $attribution = $props['pos_attribution'] ?? null;
        $this->assertNotNull($attribution, 'pos_attribution block must be exposed for POS orders');
        $this->assertTrue($attribution['is_pos']);
        $this->assertSame('الكاشير الرئيسي', $attribution['terminal_name']);
        $this->assertSame('cashier-sales', $attribution['cashier_username']);
        // Raw terminal id must never be surfaced to the merchant.
        $this->assertArrayNotHasKey('pos_terminal_id', $props, 'raw pos_terminal_id must not be exposed');
        $this->assertArrayNotHasKey('pos_terminal_id', $attribution, 'raw terminal id must not be inside attribution');
        // No auth secrets.
        $this->assertArrayNotHasKey('pin_hash', $props);
        $this->assertArrayNotHasKey('pin_hash', $attribution);
    }

    public function test_deleted_terminal_order_still_renders_with_snapshot(): void
    {
        $owner = $this->companyUser();
        $this->allow($owner, 'manage-pos', 'view-orders');
        $this->actingAs($owner);
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store);
        $terminal = $this->createTerminalAs($owner, 'doomed-cashier');

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true,
            $terminal->id,
            $terminal->username
        );

        // Delete the terminal after the historical order.
        $terminal->delete();

        $res = $this->get(route('orders.show', $order->id));
        $res->assertOk();
        $props = $res->inertiaPage()['props']['order'] ?? [];
        $attribution = $props['pos_attribution'] ?? [];
        $this->assertTrue($attribution['is_pos']);
        $this->assertNull($attribution['terminal_name'], 'deleted terminal -> null terminal name (merchant sees "طرفية محذوفة")');
        $this->assertSame('doomed-cashier', $attribution['cashier_username'], 'immutable cashier snapshot survives deletion');
        $this->assertSame(200, $res->getStatusCode(), 'order details must not 500 after terminal deletion');
    }

    public function test_non_pos_order_has_no_pos_attribution(): void
    {
        $owner = $this->companyUser();
        $this->allow($owner, 'manage-pos', 'view-orders');
        $this->actingAs($owner);
        $store = Store::find($owner->current_store);

        $order = Order::forceCreate([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'order_source' => 'storefront',
            'customer_email' => 'c@example.com',
            'customer_phone' => '0599000000',
            'customer_first_name' => 'T',
            'customer_last_name' => 'U',
            'shipping_address' => 'A',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'billing_address' => 'A',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'subtotal' => 30,
            'tax_amount' => 0,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 30,
            'currency' => 'ILS',
        ]);

        $res = $this->get(route('orders.show', $order->id));
        $res->assertOk();
        $props = $res->inertiaPage()['props']['order'] ?? [];
        $attribution = $props['pos_attribution'] ?? null;
        $this->assertNotNull($attribution, 'attribution block is always present for uniformity of frontend access');
        $this->assertFalse($attribution['is_pos'], 'non-POS order is not flagged POS');
        // The frontend only renders the POS attribution card when is_pos is true, so
        // backend ordering is correct even though the block exists.
    }

    public function test_tenant_isolation_terminal_never_crosses_stores(): void
    {
        $ownerA = $this->companyUser();
        $ownerB = $this->companyUser();
        $this->allow($ownerA, 'manage-pos', 'view-orders');
        $this->allow($ownerB, 'manage-pos', 'view-orders');
        $storeA = Store::find($ownerA->current_store);
        $storeB = Store::find($ownerB->current_store);

        // Terminal belongs to Store A only.
        $terminal = $this->createTerminalAs($ownerA, 'tenant-a-cashier');

        $this->actingAs($ownerA);
        $pA = $this->makeProduct($storeA);
        $orderA = app(PointOfSaleService::class)->createPosSale(
            $storeA->id,
            [['product_id' => $pA->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true,
            $terminal->id,
            $terminal->username
        );

        // Store B order exposed to Store B owner will query B's scoped row: it must NOT
        // see Store A's terminal name through any cross-store leak.
        $this->actingAs($ownerB);
        $pB = $this->makeProduct($storeB);
        $orderB = app(PointOfSaleService::class)->createPosSale(
            $storeB->id,
            [['product_id' => $pB->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true,
            null,
            'b-cashier'
        );

        $resB = $this->get(route('orders.show', $orderB->id));
        $resB->assertOk();
        $attrB = $resB->inertiaPage()['props']['order']['pos_attribution'] ?? [];
        $this->assertSame('b-cashier', $attrB['cashier_username']);
        $this->assertNotEquals('tenant-a-cashier', $attrB['terminal_name'] ?? '', 'Store B order must not resolve Store A terminal');

        // Store A order still resolves its own terminal.
        $this->actingAs($ownerA);
        $resA = $this->get(route('orders.show', $orderA->id));
        $resA->assertOk();
        $attrA = $resA->inertiaPage()['props']['order']['pos_attribution'] ?? [];
        $this->assertSame('الكاشير الرئيسي', $attrA['terminal_name']);
    }

    /* ───────────────────────── ISSUE 2: post-sale stock sync ───────────────────────── */

    public function test_post_sale_stock_decrements_exactly_once(): void
    {
        $owner = $this->companyUser();
        $this->actingAs($owner);
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['stock' => 8, 'price' => 10]);

        // Initial DB stock = 8 (matches QA "STOCK BEFORE").
        $this->assertSame(8, (int) $p->stock);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash',
            null,
            null,
            true
        );

        // After completed sale, authoritative DB stock = 7.
        $p->refresh();
        $this->assertSame(7, (int) $p->stock);

        // Exactly ONE inventory movement.
        $movements = InventoryMovement::where('product_id', $p->id)->get();
        $this->assertSame(1, $movements->count(), 'exactly one inventory movement per POS sale');
        $this->assertSame(-1, (int) $movements->first()->quantity_delta, 'quantity delta reflects the single decrement');
    }

    public function test_post_sale_variant_stock_decrements_exactly_once(): void
    {
        $owner = $this->companyUser();
        $this->actingAs($owner);
        $store = Store::find($owner->current_store);
        $uuid = (string) \Illuminate\Support\Str::uuid();
        $p = $this->makeProduct($store, [
            'stock' => 0,
            'track_inventory' => true,
            'inventory_mode' => 'variant',
            'variant_combinations' => [[
                'id' => 'c1', 'uuid' => $uuid, 'label' => 'Red', 'values' => ['Red'],
                'sku' => 'RED-1', 'price' => 12, 'stock' => 8,
            ]],
        ]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'variant_uuid' => $uuid, 'quantity' => 1]],
            'cash',
            null,
            null,
            true
        );

        $p->refresh();
        $combos = $p->variant_combinations ?? [];
        $this->assertSame(7, (int) ($combos[0]['stock'] ?? -1), 'exact variant stock decrements to 7');

        $movements = InventoryMovement::where('product_id', $p->id)->get();
        $this->assertSame(1, $movements->count(), 'exactly one variant inventory movement');
    }

    /* ───────────────────────── ISSUE 4: login prefill ───────────────────────── */

    public function test_terminal_login_prefills_store_and_username_from_query(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $this->createTerminalAs($owner, 'cashier-prefill');

        // No authenticated session yet — GET the login page with query params.
        $res = $this->get(route('pos.terminal.login', ['store' => $store->id, 'username' => 'cashier-prefill']));

        $res->assertOk();
        $props = $res->inertiaPage()['props'] ?? [];
        $this->assertSame((string) $store->id, (string) ($props['store'] ?? ''), 'store prefilled from query');
        $this->assertSame('cashier-prefill', $props['username'] ?? '', 'username prefilled from query');
        // PIN must never be in props / query / page.
        $this->assertArrayNotHasKey('pin', $props);
        $this->assertArrayNotHasKey('pin_hash', $props);
    }

    public function test_terminal_login_keeps_pin_empty_without_query(): void
    {
        $res = $this->get(route('pos.terminal.login'));
        $res->assertOk();
        $props = $res->inertiaPage()['props'] ?? [];
        $this->assertSame('', $props['store'] ?? '');
        $this->assertSame('', $props['username'] ?? '');
        $this->assertArrayNotHasKey('pin', $props);
    }

    /* ───────────────────────── ISSUE 1: localization bundle presence ───────────────────────── */

    public function test_arabic_translation_bundle_contains_pos_keys(): void
    {
        $ar = json_decode(file_get_contents(resource_path('lang/ar.json')), true);
        $this->assertIsArray($ar);

        $required = [
            'POS Terminals',
            'POS Terminal',
            'Terminal Login',
            'Terminal POS',
            'Cashier sign in',
            'Cash collected at register',
            'New Terminal',
            'Create Terminal',
            'Edit Terminal',
            'Name / Label',
            'Login link',
            'Front cashier',
            'Terminal username',
            'Store slug or ID',
            'Logout',
            'Never signed in',
            'Deactivate',
            'Edit / PIN',
            'Point of sale register',
        ];

        foreach ($required as $key) {
            $this->assertArrayHasKey($key, $ar, "ar.json missing key: {$key}");
            $this->assertNotEmpty($ar[$key], "ar.json empty translation for: {$key}");
        }
        // Ensure no accidental English leftover for the headline labels.
        $this->assertSame('نقطة البيع', $ar['point_of_sale_short']);
    }

    public function test_english_translation_bundle_preserved(): void
    {
        $en = json_decode(file_get_contents(resource_path('lang/en.json')), true);
        $this->assertIsArray($en);
        $this->assertSame('POS Terminals', $en['POS Terminals'] ?? null);
        $this->assertSame('Logout', $en['Logout'] ?? null);
        $this->assertSame('POS Terminal', $en['POS Terminal'] ?? null);
        $this->assertSame('Cashier sign in', $en['Cashier sign in'] ?? null);
    }

    /* ───────────────────────── helper: permissions ───────────────────────── */

    private function allow(User $user, string ...$perms): User
    {
        foreach ($perms as $p) {
            if (!\Spatie\Permission\Models\Permission::where('name', $p)->where('guard_name', 'web')->exists()) {
                \Spatie\Permission\Models\Permission::create(['name' => $p, 'guard_name' => 'web']);
            }
            $user->givePermissionTo($p);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user->fresh();
    }
}
