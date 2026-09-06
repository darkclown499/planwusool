<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P2D-02 — Mobile Orders UX.
 *
 * Verifies the merchant orders surface stays usable at mobile widths without
 * changing grouping semantics, status taxonomy, filtering, or tenant scoping.
 * Assertions are semantic (page/controller contract + shared terminology),
 * not brittle against Tailwind class names.
 */
class MobileOrdersUxTest extends TestCase
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

    public function test_five_grouped_tabs_remain_present(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString("{ key: '', label: 'الكل' }", $source);
        $this->assertStringContainsString("{ key: 'new', label: 'جديد' }", $source);
        $this->assertStringContainsString("{ key: 'in_progress', label: 'قيد التنفيذ' }", $source);
        $this->assertStringContainsString("{ key: 'completed', label: 'مكتملة' }", $source);
        $this->assertStringContainsString("{ key: 'issues', label: 'مشاكل/أخرى' }", $source);
        $this->assertStringContainsString("aria-label={t('Order groups')}", $source, 'group tablist must remain accessible');
    }

    public function test_mobile_order_representation_has_number_customer_total_status(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createOrder($store, ['status' => 'shipped', 'customer_first_name' => 'Mobile', 'customer_last_name' => 'User', 'total_amount' => 99.5]);
        $this->actingAs($user);

        $res = $this->get(route('orders.index'));
        $res->assertStatus(200);
        $order = $res->inertiaPage()['props']['orders'][0];

        $this->assertArrayHasKey('orderNumber', $order, 'order number must be present for mobile card');
        $this->assertArrayHasKey('customer', $order, 'customer must be present for mobile card');
        $this->assertArrayHasKey('total', $order, 'total must be present for mobile card');
        $this->assertArrayHasKey('status', $order, 'status must be present for mobile card');
        $this->assertArrayHasKey('date', $order, 'date/timestamp must be present for mobile card');
        $this->assertNotEmpty($order['orderNumber']);
        $this->assertEquals(99.5, $order['total']);
    }

    public function test_mobile_card_has_an_open_details_navigation(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString("route('orders.show', order.id)", $source, 'mobile card must expose a details navigation');
        $this->assertStringContainsString("route('orders.show', orderId)", $source, 'view action must navigate to order details');
    }

    public function test_desktop_table_and_mobile_cards_both_rendered_from_same_page(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString('lg:block', $source, 'desktop table container must exist');
        $this->assertStringContainsString('lg:hidden', $source, 'mobile card list container must exist');
        $this->assertStringContainsString('{tOrderStatus(order.status)}', $source, 'rows must render individual statuses via shared util');
    }

    public function test_order_details_link_resolves_for_current_store_order(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->createOrder($store, ['status' => 'delivered']);
        $this->actingAs($user);

        $res = $this->get(route('orders.show', $order->id));
        $res->assertStatus(200);
        $this->assertEquals($order->order_number, $res->inertiaPage()['props']['order']['orderNumber']);
    }

    public function test_delivered_row_status_remains_shipped_terminology(): void
    {
        $source = file_get_contents(resource_path('js/utils/order-status.ts'));
        $this->assertStringContainsString("delivered: 'تم التسليم'", $source, 'delivered individual status must stay تم التسليم');
        $this->assertStringContainsString("shipped: 'تم الشحن'", $source, 'shipped status must stay تم الشحن');

        $pageSource = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringNotContainsString("{ key: 'completed', label: 'تم التسليم' }", $pageSource, 'group tab must not reuse delivered row label');
    }

    public function test_search_and_filter_controls_remain_available(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString('Search by order number', $source, 'search must remain present');
        $this->assertStringContainsString('Payment Status', $source, 'payment status filter must remain present');
        $this->assertStringContainsString('Payment Method', $source, 'payment method filter must remain present');
        $this->assertStringContainsString('Source', $source, 'source filter must remain present');
        $this->assertStringContainsString('Clear All Filters', $source, 'clear/reset filter action must remain accessible');
    }

    public function test_actions_are_permission_gated_not_new_authorizations(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString("hasPermission('view-orders')", $source, 'view action must be permission gated');
        $this->assertStringContainsString("hasPermission('edit-orders')", $source, 'edit action must be permission gated');
        $this->assertStringContainsString("hasPermission('delete-orders')", $source, 'delete action must be permission gated');
    }

    public function test_store_isolation_remains_untouched(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $this->createOrder($storeA, ['status' => 'pending', 'customer_first_name' => 'StoreA']);
        $this->createOrder($storeB, ['status' => 'delivered', 'customer_first_name' => 'StoreB']);
        $this->actingAs($userA);

        $res = $this->get(route('orders.index'));
        $res->assertStatus(200);
        $orders = $res->inertiaPage()['props']['orders'];
        $this->assertCount(1, $orders);
        $this->assertStringContainsString('StoreA', $orders[0]['customer']);
        $this->assertStringNotContainsString('StoreB', $orders[0]['customer']);
    }

    public function test_listing_is_rtl_friendly_no_directional_space_utilities(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringNotContainsString('space-x-', $source, 'no LTR-only space-x within the orders page');
    }
}
