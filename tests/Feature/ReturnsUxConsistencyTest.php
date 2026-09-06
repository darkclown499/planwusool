<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P2B-04 Merchant Returns UX Consistency.
 *
 * Confirms the merchant returns area uses the canonical مرتجع/المرتجعات noun,
 * relates every return to its original order and customer, keeps the cancelled
 * status visible, stays store-isolated, and does not alter refund/business logic.
 */
class ReturnsUxConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private string $indexPage;
    private string $showPage;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $this->indexPage = resource_path('js/pages/returns/index.tsx');
        $this->showPage = resource_path('js/pages/returns/show.tsx');
    }

    // ---- Helpers (mirror OrderFilterTest / StoreIsolationIdorTest) ----

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'superadmin', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Returns Ux Store';
        $store->slug = 'returns-ux-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@e.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user->fresh(), $store->fresh()];
    }

    private function merchantOwnerWithStorePermissions(): array
    {
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 5, 'max_products_per_store' => 100, 'max_users_per_store' => 5]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addYear(), 'plan_is_active' => 1, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Merchant ' . uniqid();
        $store->slug = 'merchant-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'm@e.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        $user->givePermissionTo(['manage-orders', 'view-orders']);
        return [$user->fresh(), $store->fresh()];
    }

    private function createOrder(Store $store, array $over = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => 'delivered',
            'payment_status' => 'paid',
            'payment_method' => 'cod',
            'customer_email' => 'cust@example.com',
            'customer_first_name' => 'Saleh',
            'customer_last_name' => 'Ahmed',
            'customer_phone' => '0591111111',
            'shipping_address' => 'addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'addr',
            'billing_city' => 'N',
            'billing_state' => 'W',
            'billing_country' => 'PS',
            'subtotal' => 10,
            'total_amount' => 20,
            'shipping_amount' => 5,
        ], $over));
    }

    private function createCustomer(Store $store): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'ليلى',
            'last_name' => 'حسان',
            'email' => 'leyla@example.com',
            'phone' => '0592222222',
        ]);
    }

    private function createReturn(Store $store, Order $order, array $over = []): OrderReturn
    {
        return OrderReturn::forceCreate(array_merge([
            'return_number' => OrderReturn::generateReturnNumber(),
            'store_id' => $store->id,
            'order_id' => $order->id,
            'customer_email' => $order->customer_email,
            'status' => 'requested',
            'reason' => 'not_suitable',
            'refund_status' => 'none',
            'refund_amount' => 0,
            'requested_at' => now()->subDay(),
        ], $over));
    }

    private function assertBlocked($response): void
    {
        $this->assertTrue(in_array($response->status(), [403, 404]), 'Expected 403 or 404 but got ' . $response->status());
    }

    // ---- Canonical terminology ----

    public function test_returns_index_empty_state_uses_canonical_return_noun(): void
    {
        $i = file_get_contents($this->indexPage);
        $this->assertStringContainsString('لا توجد مرتجعات حالياً', $i, 'empty state title must use the canonical return noun مرتجعات');
        $this->assertStringContainsString('ستظهر هنا طلبات الإرجاع عند إنشائها.', $i, 'empty state must keep the explanatory sentence');
        $this->assertStringNotContainsString('لا توجد طلبات إرجاع', $i, 'no legacy title variant');
    }

    public function test_merchant_navigation_labels_returns_area_canonically(): void
    {
        $nav = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString("Returns: 'المرتجعات'", $nav, 'merchant nav area label must be المرتجعات');
        $this->assertStringContainsString("path.startsWith('/returns')", $nav, '/returns must map to the orders section');
    }

    // ---- Runtime behaviour ----

    public function test_returns_index_renders_empty_for_new_store(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $res = $this->get(route('returns.index'));
        $res->assertOk();
        $props = $res->inertiaPage()['props'];
        $this->assertSame(0, (int) $props['returns']['total']);
    }

    public function test_returns_index_rows_include_related_order_and_customer(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->createOrder($store);
        $customer = $this->createCustomer($store);
        $ret = $this->createReturn($store, $order, ['customer_id' => $customer->id]);
        $this->actingAs($user);

        $res = $this->get(route('returns.index'));
        $res->assertOk();
        $rows = collect($res->inertiaPage()['props']['returns']['data']);
        $row = $rows->firstWhere('id', $ret->id);
        $this->assertNotNull($row, 'return row must be present');
        $this->assertSame($ret->return_number, $row['return_number']);
        $this->assertSame($order->id, $row['order']['id']);
        $this->assertSame($order->order_number, $row['order']['order_number']);
        $this->assertSame($customer->full_name, $row['customer']['full_name']);
    }

    public function test_returns_show_props_include_related_order_and_customer(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->createOrder($store);
        $customer = $this->createCustomer($store);
        $ret = $this->createReturn($store, $order, ['customer_id' => $customer->id]);
        $this->actingAs($user);

        $res = $this->get(route('returns.show', $ret->id));
        $res->assertOk();
        $props = $res->inertiaPage()['props'];
        $this->assertSame($ret->return_number, $props['ret']['return_number']);
        $this->assertSame($order->order_number, $props['order']['order_number']);
        $this->assertSame($customer->full_name, $props['ret']['customer']['full_name']);
    }

    // ---- Status coverage ----

    public function test_returns_index_tabs_cover_all_return_statuses(): void
    {
        $i = file_get_contents($this->indexPage);
        foreach (array_values(OrderReturn::STATUSES) as $status) {
            $this->assertMatchesRegularExpression('/key: \'' . preg_quote($status, '/') . '\'/', $i, "tab for status $status must exist");
        }
        $this->assertStringContainsString("{ key: 'cancelled', label: 'ملغي' }", $i, 'cancelled tab must be labelled ملغي');
    }

    // ---- Related-order linkage ----

    public function test_returns_pages_link_related_order_via_authorized_route(): void
    {
        $i = file_get_contents($this->indexPage);
        $this->assertStringContainsString("route('orders.show', r.order_id)", $i, 'index row order link must use orders.show');

        $s = file_get_contents($this->showPage);
        $this->assertStringContainsString("route('orders.show', order?.id ?? ret.order_id)", $s, 'show summary order link must use orders.show');
    }

    public function test_returns_show_uses_customer_full_name(): void
    {
        $s = file_get_contents($this->showPage);
        $this->assertStringNotContainsString('ret.customer?.name', $s, 'show must not reference non-existent customer.name accessor');
        $this->assertStringContainsString('customerName(ret.customer)', $s, 'show must resolve the customer display name via the full_name helper');
        $this->assertStringContainsString('c.full_name', $s, 'the customerName helper must read the appended full_name attribute');
    }

    // ---- Mobile / small screen layout ----

    public function test_returns_index_guards_horizontal_overflow_on_small_screens(): void
    {
        $i = file_get_contents($this->indexPage);
        $this->assertMatchesRegularExpression('/overflow-x-auto/', $i, 'status tabs must scroll horizontally instead of overflowing');
        $this->assertStringContainsString('flex-wrap', $i, 'row content must wrap on small screens');
        $this->assertStringContainsString('min-w-0', $i, 'text column must allow truncation instead of forcing overflow');
        $this->assertStringContainsString('shrink-0', $i, 'inline pills must not force narrow columns wider');
    }

    // ---- Isolation (UX must not leak other stores) ----

    public function test_merchant_cannot_see_other_store_return_and_its_order(): void
    {
        [$userA, $storeA] = $this->merchantOwnerWithStorePermissions();
        [$userB, $storeB] = $this->merchantOwnerWithStorePermissions();
        $orderB = $this->createOrder($storeB);
        $retB = $this->createReturn($storeB, $orderB);

        $this->actingAs($userA);

        $this->assertBlocked($this->get(route('returns.show', $retB->id)));

        $resIndex = $this->get(route('returns.index'));
        $resIndex->assertOk();
        $this->assertSame(0, (int) $resIndex->inertiaPage()['props']['returns']['total'], 'store A index must not expose store B returns');

        $this->assertBlocked($this->get(route('orders.show', $orderB->id)));
    }

    // ---- Business logic untouched ----

    public function test_return_and_refund_status_contracts_unchanged(): void
    {
        $this->assertSame(
            ['requested', 'approved', 'rejected', 'in_transit', 'received', 'completed', 'cancelled'],
            array_values(OrderReturn::STATUSES)
        );
        $this->assertSame(['none', 'pending', 'partial', 'refunded'], array_values(OrderReturn::REFUND_STATUSES));
    }
}