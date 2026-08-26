<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Models\OrderReturn;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderFilterTest extends TestCase
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

    public function test_index_returns_all_orders_for_store(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['customer_first_name' => 'Alice']);
        $this->createOrder($store, ['customer_first_name' => 'Bob']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index'));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertCount(2, $props['orders']);
        $this->assertEquals(2, $props['pagination']['total']);
    }

    public function test_search_by_order_number(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->createOrder($store);
        $o2 = $this->createOrder($store, ['customer_first_name' => 'Charlie']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['search' => substr($o1->order_number, 0, 6)]));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertGreaterThanOrEqual(1, $props['pagination']['total']);
        $numbers = collect($props['orders'])->pluck('orderNumber')->toArray();
        $this->assertContains($o1->order_number, $numbers);
    }

    public function test_search_by_customer_name(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['customer_first_name' => 'Mohammed', 'customer_last_name' => 'Ali']);
        $this->createOrder($store, ['customer_first_name' => 'Sara', 'customer_last_name' => 'Hassan']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['search' => 'Mohammed']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['pagination']['total']);
    }

    public function test_search_by_phone(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['customer_phone' => '0591234567']);
        $this->createOrder($store, ['customer_phone' => '0529876543']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['search' => '059123']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['pagination']['total']);
    }

    public function test_filter_by_status(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'pending']);
        $this->createOrder($store, ['status' => 'confirmed']);
        $this->createOrder($store, ['status' => 'pending']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['status' => 'pending']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(2, $props['pagination']['total']);
        $this->assertEquals('pending', $props['filters']['status']);
    }

    public function test_filter_by_payment_status(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['payment_status' => 'paid']);
        $this->createOrder($store, ['payment_status' => 'pending']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['payment_status' => 'paid']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['pagination']['total']);
        $this->assertEquals('paid', $props['filters']['payment_status']);
    }

    public function test_filter_by_payment_method(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['payment_method' => 'cod']);
        $this->createOrder($store, ['payment_method' => 'stripe']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['payment_method' => 'cod']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['pagination']['total']);
    }

    public function test_filter_by_date_range(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['created_at' => now()->subDays(10)]);
        $this->createOrder($store, ['created_at' => now()->subDays(1)]);
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['date_from' => now()->subDays(3)->format('Y-m-d'), 'date_to' => now()->format('Y-m-d')]));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['pagination']['total']);
    }

    public function test_pagination_works(): void
    {
        [$user, $store] = $this->ownerWithStore();
        for ($i = 0; $i < 20; $i++) {
            $this->createOrder($store, ['customer_first_name' => "User{$i}"]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['per_page' => 10, 'page' => 1]));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertCount(10, $props['orders']);
        $this->assertEquals(20, $props['pagination']['total']);
        $this->assertEquals(2, $props['pagination']['last_page']);
        $this->assertEquals(1, $props['pagination']['current_page']);
    }

    public function test_pagination_page_2(): void
    {
        [$user, $store] = $this->ownerWithStore();
        for ($i = 0; $i < 20; $i++) {
            $this->createOrder($store, ['customer_first_name' => "User{$i}"]);
        }
        $this->actingAs($user);

        $res = $this->get(route('orders.index', ['per_page' => 10, 'page' => 2]));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertCount(10, $props['orders']);
        $this->assertEquals(2, $props['pagination']['current_page']);
    }

    public function test_store_isolation_only_own_store_orders(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $this->createOrder($storeA, ['customer_first_name' => 'StoreA']);
        $this->createOrder($storeB, ['customer_first_name' => 'StoreB']);
        $this->actingAs($userA);

        $res = $this->get(route('orders.index'));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['pagination']['total']);
    }

    public function test_show_includes_customer_order_count(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->createOrder($store, ['customer_email' => 'repeat@test.com']);
        $this->createOrder($store, ['customer_email' => 'repeat@test.com']);
        $this->createOrder($store, ['customer_email' => 'other@test.com']);
        $this->actingAs($user);

        $res = $this->get(route('orders.show', $order->id));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(2, $props['order']['customer']['order_count']);
    }

    public function test_stats_calculate_correctly(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['total_amount' => 100, 'payment_status' => 'paid', 'status' => 'confirmed']);
        $this->createOrder($store, ['total_amount' => 200, 'payment_status' => 'paid', 'status' => 'confirmed']);
        $this->createOrder($store, ['total_amount' => 50, 'status' => 'pending']);
        $this->actingAs($user);

        $res = $this->get(route('orders.index'));
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(3, $props['stats']['totalOrders']);
        $this->assertEquals(1, $props['stats']['pendingOrders']);
        $this->assertEquals(300, $props['stats']['totalRevenue']);
        $this->assertEquals(150, $props['stats']['avgOrderValue']);
    }

    public function test_returns_index_with_search_and_filter(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->createOrder($store);
        OrderReturn::forceCreate([
            'store_id' => $store->id,
            'order_id' => $order->id,
            'return_number' => 'RET-001',
            'status' => 'requested',
            'refund_status' => 'pending',
            'refund_amount' => 0,
            'reason' => 'Defective',
        ]);
        OrderReturn::forceCreate([
            'store_id' => $store->id,
            'order_id' => $order->id,
            'return_number' => 'RET-002',
            'status' => 'approved',
            'refund_status' => 'refunded',
            'refund_amount' => 50,
            'reason' => 'Changed mind',
        ]);
        $this->actingAs($user);

        $res = $this->get(route('returns.index'));
        $res->assertStatus(200);

        $res = $this->get(route('returns.index', ['status' => 'requested']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['returns']['total']);

        $res = $this->get(route('returns.index', ['search' => 'RET-002']));
        $res->assertStatus(200);
        $props = $res->inertiaPage()['props'];
        $this->assertEquals(1, $props['returns']['total']);
    }
}
