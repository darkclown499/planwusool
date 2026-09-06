<?php

namespace Tests\Feature;

use App\Http\Controllers\OrderController;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupedOrderTabsTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'superadmin', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Test';
        $store->slug = 'test-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@e.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createOrder(Store $store, array $over = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'customer_email' => 'a@a.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '059',
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

    private function propsStatuses($res): array
    {
        return collect($res->inertiaPage()['props']['orders'])->pluck('status')->map(fn ($s) => strtolower($s))->sort()->values()->all();
    }

    public function test_groups_cover_every_order_status_exactly_once(): void
    {
        $groups = OrderController::ORDER_GROUPS;
        $this->assertSame(['new', 'in_progress', 'completed', 'issues'], array_keys($groups));

        $flattened = collect($groups)->flatten()->map(fn ($s) => strtolower($s))->sort()->values()->all();
        $this->assertSame(
            ['cancelled', 'confirmed', 'delivered', 'failed', 'pending', 'processing', 'refunded', 'shipped'],
            $flattened,
            'groups must partition the raw status taxonomy exactly once'
        );

        $seen = [];
        foreach ($groups as $groupKey => $statuses) {
            foreach ($statuses as $status) {
                $this->assertArrayNotHasKey($status, $seen, "status {$status} must belong to exactly one group");
                $seen[$status] = $groupKey;
            }
        }
    }

    public function test_new_group_includes_pending_and_confirmed_only(): void
    {
        [$user, $store] = $this->ownerWithStore();
        foreach (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as $status) {
            $this->createOrder($store, ['status' => $status, 'customer_first_name' => ucfirst($status)]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'new']));
        $res->assertStatus(200);
        $this->assertSame(['confirmed', 'pending'], $this->propsStatuses($res));
        $this->assertEquals(2, $res->inertiaPage()['props']['pagination']['total']);
        $this->assertEquals('new', $res->inertiaPage()['props']['filters']['group']);
    }

    public function test_in_progress_group_includes_processing_and_shipped_only(): void
    {
        [$user, $store] = $this->ownerWithStore();
        foreach (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as $status) {
            $this->createOrder($store, ['status' => $status]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'in_progress']));
        $res->assertStatus(200);
        $this->assertSame(['processing', 'shipped'], $this->propsStatuses($res));
        $this->assertEquals(2, $res->inertiaPage()['props']['pagination']['total']);
    }

    public function test_completed_group_includes_only_delivered(): void
    {
        [$user, $store] = $this->ownerWithStore();
        foreach (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as $status) {
            $this->createOrder($store, ['status' => $status]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'completed']));
        $res->assertStatus(200);
        $this->assertSame(['delivered'], $this->propsStatuses($res));
        $this->assertEquals(1, $res->inertiaPage()['props']['pagination']['total']);
    }

    public function test_issues_group_includes_cancelled_failed_refunded_only(): void
    {
        [$user, $store] = $this->ownerWithStore();
        foreach (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as $status) {
            $this->createOrder($store, ['status' => $status]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'issues']));
        $res->assertStatus(200);
        $this->assertSame(['cancelled', 'failed', 'refunded'], $this->propsStatuses($res));
        $this->assertEquals(3, $res->inertiaPage()['props']['pagination']['total']);
    }

    public function test_delivered_order_never_appears_in_new_group(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'pending', 'customer_first_name' => 'NewOne']);
        $this->createOrder($store, ['status' => 'delivered', 'customer_first_name' => 'DoneOne']);
        $this->actingAs($user);

        $newRes = $this->get(route('orders.index', ['group' => 'new']));
        $this->assertSame(['pending'], $this->propsStatuses($newRes));

        $completedRes = $this->get(route('orders.index', ['group' => 'completed']));
        $this->assertSame(['delivered'], $this->propsStatuses($completedRes));
    }

    public function test_all_tab_returns_every_store_order(): void
    {
        [$user, $store] = $this->ownerWithStore();
        foreach (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as $status) {
            $this->createOrder($store, ['status' => $status]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index'));
        $res->assertStatus(200);
        $this->assertEquals(8, $res->inertiaPage()['props']['pagination']['total']);
        $this->assertEquals('', $res->inertiaPage()['props']['filters']['group']);
    }

    public function test_group_counts_are_store_scoped_and_match_membership(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'pending']);
        $this->createOrder($store, ['status' => 'confirmed']);
        $this->createOrder($store, ['status' => 'processing']);
        $this->createOrder($store, ['status' => 'shipped']);
        $this->createOrder($store, ['status' => 'delivered']);
        $this->createOrder($store, ['status' => 'cancelled']);
        $this->createOrder($store, ['status' => 'failed']);
        $this->createOrder($store, ['status' => 'refunded']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index'));
        $counts = $res->inertiaPage()['props']['groupCounts'];
        $this->assertEquals(8, $counts['total']);
        $this->assertEquals(2, $counts['new']);
        $this->assertEquals(2, $counts['in_progress']);
        $this->assertEquals(1, $counts['completed']);
        $this->assertEquals(3, $counts['issues']);
    }

    public function test_direct_status_filter_remains_backward_compatible(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'pending']);
        $this->createOrder($store, ['status' => 'confirmed']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['status' => 'pending']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertSame(['pending'], $this->propsStatuses($res));
        $this->assertEquals('pending', $props['filters']['status']);
        $this->assertEquals('', $props['filters']['group']);
    }

    public function test_search_composes_with_group(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'pending', 'customer_first_name' => 'Alice']);
        $this->createOrder($store, ['status' => 'confirmed', 'customer_first_name' => 'Bob']);
        $this->createOrder($store, ['status' => 'delivered', 'customer_first_name' => 'Alice']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'new', 'search' => 'Alice']));
        $res->assertStatus(200);
        $this->assertEquals(1, $res->inertiaPage()['props']['pagination']['total']);
        $this->assertSame(['pending'], $this->propsStatuses($res));
    }

    public function test_pagination_is_preserved_within_group(): void
    {
        [$user, $store] = $this->ownerWithStore();
        for ($i = 0; $i < 20; $i++) {
            $this->createOrder($store, ['status' => 'pending', 'customer_first_name' => "User{$i}"]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'new', 'per_page' => 10, 'page' => 2]));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertCount(10, $props['orders']);
        $this->assertEquals(20, $props['pagination']['total']);
        $this->assertEquals(2, $props['pagination']['current_page']);
        $this->assertEquals('new', $props['filters']['group']);
    }

    public function test_tenant_isolation_groups_and_counts_never_leak_across_stores(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $this->createOrder($storeA, ['status' => 'pending', 'customer_first_name' => 'StoreA']);
        $this->createOrder($storeB, ['status' => 'pending', 'customer_first_name' => 'StoreB']);
        $this->createOrder($storeB, ['status' => 'cancelled', 'customer_first_name' => 'StoreB2']);
        $this->actingAs($userA);

        $res = $this->get(route('orders.index', ['group' => 'new']));
        $this->assertEquals(1, $res->inertiaPage()['props']['pagination']['total']);

        $resAll = $this->get(route('orders.index'));
        $counts = $resAll->inertiaPage()['props']['groupCounts'];
        $this->assertEquals(1, $counts['total'], 'Store B orders must never count toward Store A');
        $this->assertEquals(1, $counts['new']);
        $this->assertEquals(0, $counts['issues']);
    }

    public function test_client_store_id_param_is_ignored(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $this->createOrder($storeA, ['status' => 'pending', 'customer_first_name' => 'StoreA']);
        $this->createOrder($storeB, ['status' => 'pending', 'customer_first_name' => 'StoreB']);
        $this->actingAs($userA);

        $res = $this->get(route('orders.index', ['group' => 'new', 'store_id' => $storeB->id]));
        $res->assertStatus(200);
        $numbers = collect($res->inertiaPage()['props']['orders'])->pluck('orderNumber')->all();
        $this->assertCount(1, $numbers);
        $this->assertStringNotContainsString('StoreB', $numbers[0]);
        $this->assertNotContains($storeB->id, collect($res->inertiaPage()['props']['orders'])->pluck('id')->all());
    }

    public function test_unknown_group_is_ignored_and_returns_all_orders(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'pending']);
        $this->createOrder($store, ['status' => 'delivered']);
        $this->createOrder($store, ['status' => 'cancelled']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['group' => 'bogus']));
        $res->assertStatus(200);
        $this->assertEquals(3, $res->inertiaPage()['props']['pagination']['total']);
        $this->assertCount(3, $res->inertiaPage()['props']['orders']);
    }
}