<?php

namespace Tests\Feature;

use App\Models\CodPayment;
use App\Models\CodSettlement;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\PaymentFinancialMetrics;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Payments Hub consolidation — the single canonical merchant entry at /cod-payments
 * ("المدفوعات والتحصيل") with internal tabs (overview / methods / operations / cod /
 * settlements), OR-permission hub access, and legacy GET hand-offs from
 * /payments/operations and /stores/{store}/payments.
 *
 * Financial truth stays in the shared services; the hub only delegates. These tests
 * assert the IA, permission gating, legacy redirects, and that the hub's operations
 * data comes from the same PaymentOperationsData builder as the legacy controller.
 */
class PaymentHubPhaseTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store(); $store->user_id = $user->id; $store->name = 'S' . uniqid(); $store->slug = 's-' . uniqid(); $store->theme = 'bazaar-market'; $store->email = 'store@example.com'; $store->save();
        $user->current_store = $store->id; $user->save();
        $this->actingAs($user);
        return [$user->fresh(), $store];
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

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'session_id' => 'sess-' . uniqid(),
            'status' => 'pending', 'payment_status' => 'pending', 'payment_method' => 'cod',
            'customer_email' => 'c@example.com', 'customer_phone' => '0599000000', 'customer_first_name' => 'T', 'customer_last_name' => 'U',
            'shipping_address' => 'A', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'A', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
        ], $overrides));
    }

    // ─────────── Hub renders + IA ───────────

    public function test_hub_renders_overview_by_default_for_payment_user(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('cod-payments/hub')
                ->where('tab', 'overview')
                ->has('tabs')
                ->has('overview.metrics')
                ->where('store.id', $store->id));
    }

    public function test_hub_exposes_five_canonical_tabs(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');

        $res = $this->get(route('cod-payments.index'));
        $res->assertOk()->assertInertia(fn ($page) => $page
            ->component('cod-payments/hub')
            ->where('tabs.0.id', 'overview')
            ->where('tabs.1.id', 'methods')
            ->where('tabs.2.id', 'operations')
            ->where('tabs.3.id', 'cod')
            ->where('tabs.4.id', 'settlements'));
    }

    public function test_hub_tab_switching_renders_each_section(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments', 'manage-orders');
        $this->makeOrder($store, ['payment_method' => 'cod', 'total_amount' => 120]);

        $this->get(route('cod-payments.index', ['tab' => 'operations']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('cod-payments/hub')
                ->where('tab', 'operations')
                ->has('rows')
                ->has('codPending')
                ->has('settlements'));

        $this->get(route('cod-payments.index', ['tab' => 'cod']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->where('tab', 'cod')->has('payments'));

        $this->get(route('cod-payments.index', ['tab' => 'settlements']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->where('tab', 'settlements')->has('settlements')->has('codPending'));
    }

    // ─────────── Permission gating ───────────

    public function test_hub_requires_any_payment_permission(): void
    {
        [$user, $store] = $this->ownerWithStore();
        // fully strip permissions — user with none cannot open the hub
        $res = $this->actingAs(\App\Models\User::factory()->create(['type' => 'company', 'onboarded_at' => now(), 'email_verified_at' => now()]))
            ->get(route('cod-payments.index'));
        $this->assertContains($res->status(), [403, 302]);
    }

    public function test_hub_accepted_with_manage_orders_or_settings_stores_only(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        $this->allow($userA, 'manage-orders');
        $this->get(route('cod-payments.index'))->assertOk();

        [$userB, $storeB] = $this->ownerWithStore();
        $this->allow($userB, 'settings-stores');
        $this->get(route('cod-payments.index'))->assertOk();
    }

    public function test_hub_tabs_are_gated_internally(): void
    {
        // A settings-only user can open the hub but the operations/cod/settlements
        // tabs must carry their required permission so the UI gates them.
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tab', 'overview')
                ->where('tabs.1.permission', null)          // methods available to settings-stores
                ->where('tabs.2.permission', 'manage-orders')     // operations gated
                ->where('tabs.3.permission', 'manage-cod-payments') // cod gated
                ->where('tabs.4.permission', 'manage-orders'));    // settlements gated
    }

    // ─────────── Legacy GET hand-offs ───────────

    public function test_legacy_operations_route_redirects_to_hub_operations_tab_with_filters(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');

        $expected = route('cod-payments.index', ['tab' => 'operations', 'search' => 'abc', 'collection_state' => 'collected', 'payment_method' => 'cod']);
        $this->get(route('payments.operations', ['search' => 'abc', 'collection_state' => 'collected', 'payment_method' => 'cod']))
            ->assertRedirect($expected);
    }

    public function test_legacy_store_payments_get_redirects_to_hub_methods_tab(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');

        $this->get(route('stores.payments', $store->id))
            ->assertRedirect(route('cod-payments.index', ['tab' => 'methods']));
    }

    public function test_legacy_store_payments_requires_settings_stores_permission(): void
    {
        [$user, $store] = $this->ownerWithStore();
        // no settings-stores -> guarded, never lands on the methods tab
        $res = $this->actingAs(\App\Models\User::factory()->create(['type' => 'company', 'onboarded_at' => now(), 'email_verified_at' => now()]))
            ->get(route('stores.payments', $store->id));
        $this->assertContains($res->status(), [403, 302, 404]);
    }

    // ─────────── No regression: shared data + settlement routes ───────────

    public function test_hub_operations_uses_same_shared_data_as_legacy_controller(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments', 'manage-orders');
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'total_amount' => 250]);

        // The hub's operations tab must render the same rows the legacy controller
        // produced (both delegate to PaymentOperationsData).
        $this->get(route('cod-payments.index', ['tab' => 'operations']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tab', 'operations')
                ->has('rows.data')
                ->where('overview.metrics.gmv_total', 250));

        // Confirm the shared builder is what actually rendered the row.
        $ledger = app(\App\Services\PaymentOperationsData::class)->ledger($store->id, []);
        $first = $ledger->first();
        $this->assertNotNull($first);
        $this->assertEquals($order->order_number, $first['order_number']);
        $this->assertTrue($first['can_collect_cod']);
    }

    public function test_hub_settlement_mutation_routes_still_work(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments', 'manage-orders');
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 100]);
        $cod = CodPayment::create(['order_id' => $order->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);

        // Create a draft through the hub group's store route.
        $this->post(route('payments.settlements.store'), [
            'cod_payment_ids' => [$cod->id],
            'courier_company' => 'Company',
            'courier_fees' => 10,
        ])->assertOk()->assertJsonStructure(['message', 'settlement' => ['id', 'reference']]);

        $draft = CodSettlement::where('store_id', $store->id)->first();
        $this->assertNotNull($draft);
        $this->assertEquals('draft', $draft->status);

        // Settle it.
        $this->post(route('payments.settlements.settle', $draft->id))->assertOk()->assertJson(['message' => 'تم تأكيد تسوية الدفعة وتحديث حالة الطلبات']);
        $draft->refresh();
        $this->assertEquals('settled', $draft->status);
        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
    }

    // ─────────── Server-side tab gating (not frontend-only) ───────────

    public function test_settings_only_user_server_gating(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');

        // methods allowed — must have 'methods' prop, must NOT have operations/cod/settlements props
        $this->get(route('cod-payments.index', ['tab' => 'methods']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('tab', 'methods')
                ->has('methods')
                ->missing('rows')
                ->missing('payments')
            );

        // operations forbidden — 403, no ledger data leaked
        $this->get(route('cod-payments.index', ['tab' => 'operations']))->assertStatus(403);
        // cod forbidden
        $this->get(route('cod-payments.index', ['tab' => 'cod']))->assertStatus(403);
        // settlements forbidden
        $this->get(route('cod-payments.index', ['tab' => 'settlements']))->assertStatus(403);
        // overview allowed for any hub user
        $this->get(route('cod-payments.index', ['tab' => 'overview']))->assertOk()
            ->assertInertia(fn ($p) => $p->where('tab', 'overview')->has('overview'));
    }

    public function test_manage_orders_only_user_server_gating(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-orders');
        $this->makeOrder($store, ['payment_method' => 'cod', 'total_amount' => 50]);

        // operations allowed — has rows/codPending/settlements, must NOT have methods/payments
        $this->get(route('cod-payments.index', ['tab' => 'operations']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('tab', 'operations')
                ->has('rows')
                ->has('codPending')
                ->has('settlements')
                ->missing('methods')
                ->missing('payments')
            );

        // settlements allowed (certified permission manage-orders)
        $this->get(route('cod-payments.index', ['tab' => 'settlements']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('tab', 'settlements')
                ->has('settlements')
                ->has('codPending')
                ->missing('methods')
                ->missing('payments')
            );

        // methods forbidden
        $this->get(route('cod-payments.index', ['tab' => 'methods']))->assertStatus(403);
        // cod forbidden
        $this->get(route('cod-payments.index', ['tab' => 'cod']))->assertStatus(403);
    }

    public function test_manage_cod_only_user_server_gating(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 75]);
        CodPayment::create(['order_id' => $order->id, 'store_id' => $store->id, 'total_amount' => 75, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 75, 'status' => 'pending']);

        // cod allowed — has payments, must NOT have methods/rows
        $this->get(route('cod-payments.index', ['tab' => 'cod']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('tab', 'cod')
                ->has('payments')
                ->missing('methods')
                ->missing('rows')
            );

        // methods forbidden
        $this->get(route('cod-payments.index', ['tab' => 'methods']))->assertStatus(403);
        // operations forbidden
        $this->get(route('cod-payments.index', ['tab' => 'operations']))->assertStatus(403);
        // settlements forbidden
        $this->get(route('cod-payments.index', ['tab' => 'settlements']))->assertStatus(403);
    }

    public function test_direct_tab_url_cannot_bypass_permission_inertia_props(): void
    {
        // Each singleton trying each forbidden tab must get 403 and therefore no Inertia props
        [$uSettings, ] = $this->ownerWithStore();
        $this->allow($uSettings, 'settings-stores');
        $this->get(route('cod-payments.index', ['tab' => 'operations']))->assertStatus(403);
        $this->get(route('cod-payments.index', ['tab' => 'cod']))->assertStatus(403);

        [$uOrders, ] = $this->ownerWithStore();
        $this->allow($uOrders, 'manage-orders');
        $this->get(route('cod-payments.index', ['tab' => 'methods']))->assertStatus(403);
        $this->get(route('cod-payments.index', ['tab' => 'cod']))->assertStatus(403);

        [$uCod, ] = $this->ownerWithStore();
        $this->allow($uCod, 'manage-cod-payments');
        $this->get(route('cod-payments.index', ['tab' => 'methods']))->assertStatus(403);
        $this->get(route('cod-payments.index', ['tab' => 'operations']))->assertStatus(403);
        $this->get(route('cod-payments.index', ['tab' => 'settlements']))->assertStatus(403);
    }
}
