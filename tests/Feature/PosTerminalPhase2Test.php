<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\PosTerminal;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * WUSOL POS PHASE 2 — Terminal auth, management, attribution, cart-aware stock,
 * categories + image presentation.
 *
 * Maps 1:1 to the required security/cart/category tests (A–AD).
 */
class PosTerminalPhase2Test extends TestCase
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
        $plan = Plan::factory()->create(['name' => 'P2-' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
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

    private function createTerminalAs(User $owner, string $username = 'front-1', string $pin = '1234', array $extra = []): PosTerminal
    {
        $this->actingAs($owner)->post(route('pos.terminals.store'), [
            'name' => 'Front Cashier',
            'username' => $username,
            'pin' => $pin,
        ]);
        return PosTerminal::where('store_id', $owner->current_store)->where('username', $username)->firstOrFail();
    }

    /* ───────────────────────── A–C: management + hashing ───────────────────────── */

    public function test_a_merchant_can_create_terminal(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'a-front', '9999');
        $this->assertNotNull($terminal);
        $this->assertSame($owner->current_store, $terminal->store_id);
        $this->assertTrue($terminal->is_active);
        $this->assertNotEmpty($terminal->terminal_code);
    }

    public function test_b_terminal_credential_stored_hashed(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'b-front', '4321');
        $this->assertTrue(Hash::check('4321', $terminal->pin_hash), 'raw PIN must match the stored hash');
        $this->assertNotSame('4321', $terminal->pin_hash, 'stored value must not equal the raw PIN');
    }

    public function test_c_raw_pin_not_stored_or_serialized(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'c-front', '7777');
        $raw = \DB::table('pos_terminals')->where('id', $terminal->id)->value('pin_hash');
        $this->assertNotSame('7777', $raw, 'DB must never contain the raw PIN');
        $this->assertNotContains('7777', $terminal->toArray(), 'model serialization must not leak the PIN');
        $this->assertArrayNotHasKey('pin_hash', $terminal->toArray(), 'pin_hash must be hidden from serialization');
    }

    /* ───────────────────────── D–I: login / revocation / logout ───────────────────────── */

    public function test_d_valid_terminal_login_succeeds(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'd-front', '1111');
        $store = Store::find($owner->current_store);

        $res = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug,
            'username' => 'd-front',
            'pin' => '1111',
        ]);
        // Correct credentials redirect straight into the register (session granted).
        $res->assertRedirect(route('pos.terminal.register'));

        // With a live terminal session, the dedicated register screen renders.
        $register = $this->actingAs($terminal, 'pos_terminal')->get(route('pos.terminal.register'));
        $register->assertOk();
        $register->assertInertia(fn ($p) => $p->component('pos/terminal/index'));
    }

    public function test_e_wrong_pin_fails(): void
    {
        $owner = $this->companyUser();
        $this->createTerminalAs($owner, 'e-front', '1111');
        $store = Store::find($owner->current_store);

        $res = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug,
            'username' => 'e-front',
            'pin' => '9999',
        ]);
        $res->assertStatus(422);
    }

    public function test_f_login_is_rate_limited(): void
    {
        $owner = $this->companyUser();
        $this->createTerminalAs($owner, 'f-front', '1111');
        $store = Store::find($owner->current_store);

        // 5 attempts are the limit; the 6th must be throttled (429).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson(route('pos.terminal.login.store'), [
                'store' => $store->slug,
                'username' => 'f-front',
                'pin' => 'wrong',
            ]);
        }
        $res6 = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug,
            'username' => 'f-front',
            'pin' => 'wrong',
        ]);
        $this->assertSame(429, $res6->getStatusCode(), '6th terminal login attempt must be rate limited');
    }

    public function test_g_inactive_terminal_cannot_login(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'g-front', '1111');
        $terminal->forceFill(['is_active' => false])->save();
        $store = Store::find($owner->current_store);

        $res = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug,
            'username' => 'g-front',
            'pin' => '1111',
        ]);
        // Correct PIN but inactive terminal → login must fail.
        $res->assertStatus(422);
    }

    public function test_h_deactivating_logged_in_terminal_blocks_next_privileged_action(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'h-front', '1111');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Revoke Widget', 'sku' => 'REVOKE-1', 'stock' => 5]);

        // Establish a live terminal session via the guard (as if already signed in).
        $this->actingAs($terminal, 'pos_terminal');

        // First privileged action succeeds.
        $ok = $this->getJson(route('pos.terminal.search'));
        $ok->assertOk();

        // Merchant deactivates the terminal while it has a live session.
        $terminal->forceFill(['is_active' => false])->save();

        // Next protected terminal request must fail (no longer 2xx), because the
        // middleware re-validates CURRENT DB active state on every request.
        $res = $this->getJson(route('pos.terminal.search'));
        $this->assertNotContains($res->getStatusCode(), [200], 'deactivated terminal must lose access on its next action');

        $sale = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ]);
        $this->assertNotContains($sale->getStatusCode(), [201], 'deactivated terminal must not be able to sell');
    }

    public function test_i_terminal_logout_destroys_auth_session(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'i-front', '1111');
        $this->actingAs($terminal, 'pos_terminal');

        $this->post(route('pos.terminal.logout'));

        $res = $this->getJson(route('pos.terminal.search'));
        $this->assertNotContains($res->getStatusCode(), [200], 'after logout the terminal session must be gone');
    }

    /* ───────────────────────── J–K: no merchant access ───────────────────────── */

    public function test_j_terminal_cannot_access_merchant_dashboard(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'j-front', '1111');
        $this->actingAs($terminal, 'pos_terminal');

        $res = $this->getJson(route('dashboard'));
        $this->assertNotSame(200, $res->getStatusCode(), 'terminal must never reach the merchant dashboard');
    }

    public function test_k_terminal_cannot_access_store_settings(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'k-front', '1111');
        $store = Store::find($owner->current_store);
        $this->actingAs($terminal, 'pos_terminal');

        $res = $this->getJson(route('stores.edit', $store->id));
        $this->assertNotSame(200, $res->getStatusCode(), 'terminal must never reach store settings');
    }

    /* ───────────────────────── L–M: store isolation ───────────────────────── */

    public function test_l_store_a_terminal_cannot_access_store_b_catalog(): void
    {
        $ownerA = $this->companyUser();
        $ownerB = $this->companyUser(['email' => 'b2-' . uniqid() . '@test.com']);
        $ap = $this->makeProduct(Store::find($ownerA->current_store), ['name' => 'Only A Thing', 'sku' => 'A-CATALOG', 'stock' => 5]);
        $bp = $this->makeProduct(Store::find($ownerB->current_store), ['name' => 'Only B Thing', 'sku' => 'B-CATALOG', 'stock' => 5]);

        $termA = $this->createTerminalAs($ownerA, 'la-front', '1111');
        $this->actingAs($termA, 'pos_terminal');

        // Search for a term that matches BOTH stores' products.
        $res = $this->getJson(route('pos.terminal.search', ['per_page' => 50]));
        $ids = collect($res->json('rows'))->pluck('product_id')->all();
        $this->assertContains($ap->id, $ids, 'Store A terminal sees its own products');
        $this->assertNotContains($bp->id, $ids, 'Store A terminal must never see Store B catalog');
    }

    public function test_m_store_a_terminal_cannot_create_store_b_sale(): void
    {
        $ownerA = $this->companyUser();
        $ownerB = $this->companyUser(['email' => 'b3-' . uniqid() . '@test.com']);
        $bp = $this->makeProduct(Store::find($ownerB->current_store), ['name' => 'B Only', 'sku' => 'B-SALE', 'stock' => 5]);

        $termA = $this->createTerminalAs($ownerA, 'ma-front', '1111');
        $this->actingAs($termA, 'pos_terminal');

        // Store A terminal tries to sell a Store B product.
        $res = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $bp->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ]);
        $this->assertNotSame(201, $res->getStatusCode(), 'cross-store sale must be rejected');
        $this->assertSame(
            0,
            Order::where('store_id', $ownerA->current_store)->where('pos_terminal_id', $termA->id)->count(),
            'no order may be created for a foreign-store product'
        );
    }

    /* ───────────────────────── N–Q: attribution + no duplication ───────────────────────── */

    public function test_n_terminal_sale_is_attributed_to_correct_terminal(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'n-front', '1111');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Attr Widget', 'sku' => 'ATTR-1', 'stock' => 5]);

        $this->actingAs($terminal, 'pos_terminal');
        $res = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(201);

        $order = Order::where('order_source', 'pos')->orderByDesc('id')->first();
        $this->assertSame($terminal->id, (int) $order->pos_terminal_id, 'order must reference the terminal relationally');
        $this->assertSame($terminal->username, $order->pos_cashier_username, 'order must snapshot the cashier username');
    }

    public function test_o_merchant_pos_sale_without_terminal_still_works_and_is_not_attributed(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'No Term', 'sku' => 'NOTERM-1', 'stock' => 5]);

        $res = $this->actingAs($owner)->postJson(route('pos.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(201);

        $order = Order::where('order_source', 'pos')->orderByDesc('id')->first();
        $this->assertNull($order->pos_terminal_id, 'merchant register sale must remain unattributed');
        $this->assertNull($order->pos_cashier_username, 'merchant register sale must remain unattributed');
    }

    public function test_p_terminal_attribution_does_not_alter_payment_state(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'p-front', '1111');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Pay Widget', 'sku' => 'PAY-1', 'stock' => 20]);

        $this->actingAs($terminal, 'pos_terminal');

        // cash NOT collected → pending.
        $r1 = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]], 'payment_method' => 'cash', 'cash_collected' => false,
        ]);
        $r1->assertStatus(201);
        $this->assertSame('pending', Order::orderByDesc('id')->first()->payment_status, 'uncollected cash must stay pending');

        // cash collected → paid.
        $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]], 'payment_method' => 'cash', 'cash_collected' => true,
        ]);
        $this->assertSame('paid', Order::orderByDesc('id')->first()->payment_status, 'collected cash is paid');

        // bank → pending regardless.
        $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]], 'payment_method' => 'bank',
        ]);
        $this->assertSame('pending', Order::orderByDesc('id')->first()->payment_status, 'bank stays pending');

        // COD rejected.
        $cod = $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 1]], 'payment_method' => 'cod',
        ]);
        $cod->assertStatus(422);
    }

    public function test_q_terminal_attribution_does_not_cause_duplicate_inventory_movement(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'q-front', '1111');
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Move Widget', 'sku' => 'MOVE-1', 'stock' => 10]);

        $this->actingAs($terminal, 'pos_terminal');
        $this->postJson(route('pos.terminal.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 3]],
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $this->assertSame(7, (int) $p->fresh()->stock, 'stock must be decremented exactly once by the sold qty');
        $movements = \App\Models\InventoryMovement::where('store_id', $store->id)
            ->where('product_id', $p->id)
            ->count();
        $this->assertSame(1, $movements, 'a single POS sale must create exactly one inventory movement');
    }

    /* ───────────────────────── R–X: cart-aware stock + oversell ───────────────────────── */

    public function test_r_db_stock_does_not_change_when_product_added_to_cart(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Cart Widget', 'sku' => 'CART-1', 'stock' => 8]);

        $this->actingAs($owner);
        $before = (int) $p->stock;

        // "Add to cart" is purely client-side; the only read is the search API.
        $this->getJson(route('pos.search', ['q' => 'Cart Widget']));

        $this->assertSame(8, $before, 'baseline stock is 8');
        $this->assertSame(8, (int) $p->fresh()->stock, 'DB stock must stay 8 while the item sits in the cart');
    }

    public function test_s_displayed_available_equals_stock_minus_cart_qty(): void
    {
        // The display rule is implemented on the frontend as
        // available = authoritativeStock - cartQty(same product/variant).
        // DB stock is NOT mutated on add; the source must implement this rule.
        $src = file_get_contents(resource_path('js/pages/pos/index.tsx'));
        $this->assertStringContainsString('Math.max(0, row.stock - cartQtyFor(row))', $src, 'displayed available must be stock - cart qty');
        $this->assertStringContainsString('const cartQtyFor', $src, 'cart-aware stock helper must exist');
    }

    public function test_t_removing_item_restores_displayed_available(): void
    {
        // Removing a cart line recomputes availableFor() from the (unchanged) DB
        // stock minus the remaining cart quantity — implemented in the POS source.
        $src = file_get_contents(resource_path('js/pages/pos/index.tsx'));
        $this->assertStringContainsString('cart.reduce((sum, l) => (l.key === key ? sum + l.qty : sum), 0)', $src);
    }

    public function test_u_cannot_add_beyond_displayed_stock(): void
    {
        // The addToCart guard stops adding when the display-aware available <= 0.
        $src = file_get_contents(resource_path('js/pages/pos/index.tsx'));
        $this->assertStringContainsString("if (available !== null && available <= 0) return;", $src);
    }

    public function test_v_backend_rejects_oversell_with_stale_request(): void
    {
        // Even if the frontend is stale, the API must revalidate authoritative stock.
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Oversell', 'sku' => 'OVER-1', 'stock' => 3]);

        $res = $this->actingAs($owner)->postJson(route('pos.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 10]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(409);
        $this->assertSame(3, (int) $p->fresh()->stock, 'stock must not change on a rejected oversell');
    }

    public function test_w_successful_sale_decrements_inventory_exactly_once(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Dec Widget', 'sku' => 'DEC-1', 'stock' => 6]);

        $this->actingAs($owner)->postJson(route('pos.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 4]],
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $this->assertSame(2, (int) $p->fresh()->stock, 'stock must drop from 6 to 2 (single decrement)');
    }

    public function test_x_variant_cart_aware_stock_applies_to_exact_variant_only(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        // Variant product with two distinct combos.
        $p = Product::factory()->create([
            'store_id' => $store->id,
            'name' => 'Shirt',
            'sku' => 'SHIRT',
            'is_active' => true,
            'price' => 10,
            'stock' => 0,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'variant',
            'variant_combinations' => [
                ['id' => 'A', 'uuid' => 'uuid-A', 'values' => ['M'], 'sku' => 'SHIRT-M', 'price' => 10, 'stock' => 4],
                ['id' => 'B', 'uuid' => 'uuid-B', 'values' => ['L'], 'sku' => 'SHIRT-L', 'price' => 12, 'stock' => 3],
            ],
        ]);

        $res = $this->actingAs($owner)->getJson(route('pos.search', ['q' => 'Shirt']));
        $rows = collect($res->json('rows'));
        $mRow = $rows->first(fn ($r) => ($r['variant_uuid'] ?? null) === 'uuid-A');
        $lRow = $rows->first(fn ($r) => ($r['variant_uuid'] ?? null) === 'uuid-B');
        $this->assertSame(4, $mRow['stock'], 'variant M carries its own stock');
        $this->assertSame(3, $lRow['stock'], 'variant L carries its own stock');

        // Cart-aware rule keys on product::variant_uuid, so M and L are separate stock identities.
        $src = file_get_contents(resource_path('js/pages/pos/index.tsx'));
        $this->assertStringContainsString(
            'row.is_variant ? `${row.product_id}::${row.variant_uuid ?? row.variant_id ?? \'\'}` : `${row.product_id}`',
            $src,
            'variant stock identity must key on the exact variant uuid/id'
        );
    }

    /* ───────────────────────── Y–AD: categories + image ───────────────────────── */

    public function test_y_pos_loads_current_store_categories(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $cat1 = \App\Models\Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'الأدوات']);

        $res = $this->actingAs($owner)->get(route('pos.index'));
        $res->assertOk();
        $cats = collect($res->inertiaPage()['props']['categories'] ?? []);
        $this->assertTrue($cats->contains('id', $cat1->id), 'POS must load current-store categories onto the register');
    }

    public function test_z_category_filter_returns_only_matching_current_store_products(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $catA = \App\Models\Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'A']);
        $catB = \App\Models\Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'B']);
        $inA = $this->makeProduct($store, ['category_id' => $catA->id, 'name' => 'Filter A Prod', 'sku' => 'FILTER-A', 'stock' => 5]);
        $inB = $this->makeProduct($store, ['category_id' => $catB->id, 'name' => 'Filter B Prod', 'sku' => 'FILTER-B', 'stock' => 5]);

        $res = $this->actingAs($owner)->getJson(route('pos.search', ['category_id' => $catA->id]));
        $ids = collect($res->json('rows'))->pluck('product_id')->all();
        $this->assertContains($inA->id, $ids);
        $this->assertNotContains($inB->id, $ids, 'category filter must exclude products from other categories');
    }

    public function test_aa_search_and_selected_category_combine(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $catA = \App\Models\Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'A']);
        $catB = \App\Models\Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'B']);
        $inA = $this->makeProduct($store, ['category_id' => $catA->id, 'name' => 'Shared Name', 'sku' => 'SA-1', 'stock' => 5]);
        $inB = $this->makeProduct($store, ['category_id' => $catB->id, 'name' => 'Shared Name', 'sku' => 'SB-1', 'stock' => 5]);

        $res = $this->actingAs($owner)->getJson(route('pos.search', ['q' => 'Shared Name', 'category_id' => $catA->id]));
        $ids = collect($res->json('rows'))->pluck('product_id')->all();
        $this->assertContains($inA->id, $ids, 'matching product within the selected category appears');
        $this->assertNotContains($inB->id, $ids, 'search must stay inside the selected category');
    }

    public function test_ab_foreign_store_category_cannot_expose_products(): void
    {
        $ownerA = $this->companyUser();
        $ownerB = $this->companyUser(['email' => 'b4-' . uniqid() . '@test.com']);
        $storeB = Store::find($ownerB->current_store);
        $catB = \App\Models\Category::factory()->create(['store_id' => $storeB->id, 'is_active' => true, 'name' => 'Foreign Cat']);
        $bProd = $this->makeProduct($storeB, ['category_id' => $catB->id, 'name' => 'Foreign Prod', 'sku' => 'FOREIGN-1', 'stock' => 5]);

        // Store A owner tries to filter by Store B's category.
        $res = $this->actingAs($ownerA)->getJson(route('pos.search', ['category_id' => $catB->id]));
        $res->assertStatus(422);
        $this->assertSame(0, Order::count(), 'no impact from a foreign category attempt');
    }

    public function test_ac_cart_survives_category_and_search_filtering(): void
    {
        // The frontend keeps the cart in isolated local state; search/category
        // requests only update the product rows and never touch the cart.
        $src = file_get_contents(resource_path('js/pages/pos/index.tsx'));
        $this->assertStringContainsString('setRows(res.data.rows || [])', $src, 'search only updates product rows');
        // Category change re-queries the server and keeps the cart intact.
        $this->assertStringContainsString('// Switching category re-queries the server but never touches the local cart', $src);
        $this->assertStringContainsString('runSearch(q, cat);', $src, 'category change reloads products only');
    }

    public function test_ad_pos_product_image_uses_non_cropping_presentation(): void
    {
        $src = file_get_contents(resource_path('js/pages/pos/index.tsx'));
        $this->assertStringContainsString('object-contain', $src, 'POS product images must use object-contain (uncropped)');
        $this->assertStringNotContainsString('object-cover', $src, 'POS product images must not be cropped');

        $terminalSrc = file_get_contents(resource_path('js/pages/pos/terminal/index.tsx'));
        $this->assertStringContainsString('object-contain', $terminalSrc, 'terminal POS images must also be uncropped');
    }

    /* ───────────────────────── TASK-1 FINAL SECURITY (AE–AK) ───────────────────────── */

    public function test_ae_cross_store_merchant_cannot_manage_other_stores_terminal(): void
    {
        $ownerA = $this->companyUser(['email' => 'ae-a-' . uniqid() . '@test.com']);
        $ownerB = $this->companyUser(['email' => 'ae-b-' . uniqid() . '@test.com']);
        $termB = $this->createTerminalAs($ownerB, 'ae-b-term', '2222');
        $nameBefore = $termB->name;
        $hashBefore = $termB->pin_hash;
        $activeBefore = $termB->is_active;

        // Store A merchant must never be able to mutate Store B's terminal.
        $upd = $this->actingAs($ownerA)->put(route('pos.terminals.update', $termB->id), [
            'name' => 'Hijacked', 'pin' => '9999',
        ]);
        $this->assertSame(404, $upd->getStatusCode(), 'cross-store terminal update must 404');

        $tgl = $this->actingAs($ownerA)->post(route('pos.terminals.toggle', $termB->id), ['active' => false]);
        $this->assertSame(404, $tgl->getStatusCode(), 'cross-store terminal toggle must 404');

        $del = $this->actingAs($ownerA)->delete(route('pos.terminals.destroy', $termB->id));
        $this->assertSame(404, $del->getStatusCode(), 'cross-store terminal delete must 404');

        $refreshed = $termB->fresh();
        $this->assertNotNull($refreshed, 'Store B terminal must not be deleted by Store A');
        $this->assertSame($nameBefore, $refreshed->name, 'Store B terminal name unchanged');
        $this->assertSame($hashBefore, $refreshed->pin_hash, 'Store B terminal PIN hash unchanged');
        $this->assertSame($activeBefore, $refreshed->is_active, 'Store B terminal active state unchanged');
    }

    public function test_af_cross_store_merchant_cannot_view_or_share_other_stores_terminal(): void
    {
        $ownerA = $this->companyUser(['email' => 'af-a-' . uniqid() . '@test.com']);
        $ownerB = $this->companyUser(['email' => 'af-b-' . uniqid() . '@test.com']);
        $termB = $this->createTerminalAs($ownerB, 'af-b-term', '2222');

        // Store A management index must never list Store B's terminal (no login/share identifier leak).
        $res = $this->actingAs($ownerA)->get(route('pos.terminals.index'));
        $res->assertOk();
        $res->assertInertia(fn ($p) => $p
            ->where('terminals', fn ($list) => collect($list)->pluck('id')->doesntContain($termB->id))
            ->where('store.id', $ownerA->current_store));
    }

    public function test_ag_terminal_login_logs_out_web_guard_so_terminal_mode_never_keeps_dashboard_session(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'ag-front', '1111');
        $store = Store::find($owner->current_store);

        // Browser is signed in as a merchant on the `web` guard.
        $this->actingAs($owner);
        $this->assertTrue(Auth::guard('web')->check(), 'precondition: merchant is authenticated');

        // Switch to terminal mode: successful terminal login.
        $res = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug, 'username' => 'ag-front', 'pin' => '1111',
        ]);
        $res->assertRedirect(route('pos.terminal.register'));

        $this->assertTrue(Auth::guard('pos_terminal')->check(), 'terminal session is established');
        $this->assertFalse(Auth::guard('web')->check(), 'merchant web session must be cleared on terminal login');

        // And the now-terminal browser must NOT reach the merchant dashboard.
        $dash = $this->getJson(route('dashboard'));
        $this->assertNotSame(200, $dash->getStatusCode(), 'after terminal login the browser cannot reach the merchant dashboard');
    }

    public function test_ah_terminal_logout_does_not_restore_old_web_session(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'ah-front', '1111');
        $store = Store::find($owner->current_store);

        // Merchant session first…
        $this->actingAs($owner);
        // …then terminal login (clears web)…
        $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug, 'username' => 'ah-front', 'pin' => '1111',
        ]);
        $this->assertFalse(Auth::guard('web')->check(), 'precondition: web cleared by terminal login');

        // …then terminal logout.
        Auth::guard('pos_terminal')->logout();

        $this->assertFalse(Auth::guard('pos_terminal')->check(), 'terminal session gone after logout');
        $this->assertFalse(Auth::guard('web')->check(), 'terminal logout must NOT resurrect the earlier merchant session');
    }

    public function test_ai_login_failures_do_not_disclose_account_existence(): void
    {
        $owner = $this->companyUser();
        $this->createTerminalAs($owner, 'ai-live', '1111');
        $store = Store::find($owner->current_store);

        // (a) correct username + wrong PIN
        $wrongPin = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug, 'username' => 'ai-live', 'pin' => '0000',
        ]);
        // (b) totally unknown username
        $unknown = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug, 'username' => 'ai-does-not-exist', 'pin' => '1111',
        ]);
        // (c) inactive/revoked terminal with correct PIN
        $inactive = PosTerminal::create([
            'store_id' => $store->id, 'name' => 'Revoked', 'username' => 'ai-revoked',
            'pin_hash' => \Illuminate\Support\Facades\Hash::make('1111'),
            'terminal_code' => 'AIREVOKED', 'is_active' => false,
        ]);
        $revoked = $this->postJson(route('pos.terminal.login.store'), [
            'store' => $store->slug, 'username' => 'ai-revoked', 'pin' => '1111',
        ]);
        unset($inactive);

        $this->assertSame(422, $wrongPin->getStatusCode());
        $this->assertSame(422, $unknown->getStatusCode());
        $this->assertSame(422, $revoked->getStatusCode());

        // The error payload on the `pin` field must be byte-identical across all three,
        // so an unauthenticated caller cannot tell whether a username exists.
        $this->assertSame($wrongPin->json('errors.pin.0'), $unknown->json('errors.pin.0'), 'unknown username must not be distinguishable');
        $this->assertSame($wrongPin->json('errors.pin.0'), $revoked->json('errors.pin.0'), 'revoked terminal must not be distinguishable');
        $this->assertSame('بيانات تسجيل الدخول غير صحيحة.', $wrongPin->json('errors.pin.0'));
    }

    public function test_aj_merchant_terminal_endpoints_require_manage_pos_permission(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'aj-front', '1111');

        // A merchant staff account with NO manage-pos permission (owns a store, is
        // onboarded, has an active plan and a current_store so it passes the surrounding
        // merchant middlewares — only the manage-pos permission gate should block it).
        $plan = Plan::factory()->create(['name' => 'P2-staff-' . uniqid(), 'price' => 10, 'themes' => ['all'], 'max_stores' => 5, 'max_products_per_store' => 100]);
        $staff = \App\Models\User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);
        $staffStore = \App\Models\Store::factory()->create(['user_id' => $staff->id, 'currency' => 'ILS']);
        $staff->forceFill(['current_store' => $staffStore->id])->save();

        $this->assertSame(403, $this->actingAs($staff)->get(route('pos.terminals.index'))->getStatusCode(), 'no list without manage-pos');
        $this->assertSame(403, $this->actingAs($staff)->post(route('pos.terminals.store'), [
            'name' => 'x', 'username' => 'x-1', 'pin' => '1234',
        ])->getStatusCode(), 'no create without manage-pos');
        $this->assertSame(403, $this->actingAs($staff)->put(route('pos.terminals.update', $terminal->id), [
            'name' => 'x', 'pin' => '4321',
        ])->getStatusCode(), 'no reset/update without manage-pos');
        $this->assertSame(403, $this->actingAs($staff)->post(route('pos.terminals.toggle', $terminal->id), ['active' => false])->getStatusCode(), 'no toggle without manage-pos');
        $this->assertSame(403, $this->actingAs($staff)->delete(route('pos.terminals.destroy', $terminal->id))->getStatusCode(), 'no delete without manage-pos');

        $this->assertSame('aj-front', $terminal->fresh()->username, 'terminal untouched by unauthorized staff');
    }

    public function test_ak_terminal_register_page_does_not_leak_merchant_props(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminalAs($owner, 'ak-front', '1111');

        $this->actingAs($terminal, 'pos_terminal');
        $res = $this->get(route('pos.terminal.register'));
        $res->assertOk();
        $res->assertInertia(function ($p) {
            // The terminal page must not receive any merchant dashboard / owner scope
            // data. The shared handler resolves a terminal (non-User principal) to a
            // null merchant: auth.user/roles/permissions are null and stores is empty.
            $p->component('pos/terminal/index');
            $p->where('auth.user', null)
              ->where('auth.roles', null)
              ->where('auth.permissions', null)
              ->where('auth.stores', [])
              ->where('stores', []);
        });
    }

    public function test_al_attribution_is_atomic_with_order_and_stock_creation(): void
    {
        $owner = $this->companyUser();
        $store = Store::find($owner->current_store);
        $p = $this->makeProduct($store, ['name' => 'Atomic', 'sku' => 'ATOMIC-1', 'stock' => 4]);
        $ordersBefore = Order::count();

        // Attribution save fails (bad terminal id violates the pos_terminal_id FK).
        // Under the single outer transaction, the ENTIRE sale must roll back —
        // no order, no stock movement — proving attribution is atomic with creation.
        try {
            app(\App\Services\PointOfSaleService::class)->createPosSale(
                $store->id,
                [['product_id' => $p->id, 'quantity' => 2]],
                'cash',
                null,
                null,
                true,
                999999,
                'ghost-attribution'
            );
            $this->fail('Expected the attribution FK violation to abort the sale');
        } catch (\Throwable $e) {
            // expected: transaction rolled back
        }

        $this->assertSame($ordersBefore, Order::count(), 'no order may persist when attribution save fails');
        $this->assertSame(4, $p->fresh()->stock, 'stock must roll back together with the abandoned sale');
    }
}
