<?php

namespace Tests\Feature;

use App\Events\OrderStatusChanged;
use App\Http\Controllers\OrderController;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrderBulkStatusActionTest extends TestCase
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

    public function test_bulk_actions_map_to_canonical_statuses(): void
    {
        $this->assertSame([
            'confirm' => 'confirmed',
            'mark_shipped' => 'shipped',
            'mark_delivered' => 'delivered',
        ], OrderController::BULK_ACTIONS);
        $this->assertSame(50, OrderController::BULK_MAX_ORDER_IDS);
    }

    public function test_bulk_confirm_transitions_all_eligible_orders(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->createOrder($store, ['status' => 'pending']);
        $o2 = $this->createOrder($store, ['status' => 'pending']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$o1->id, $o2->id],
            'action' => 'confirm',
        ]);

        $res->assertStatus(200);
        $data = $res->json();
        $this->assertSame(2, $data['summary']['total']);
        $this->assertSame(2, $data['summary']['succeeded']);
        $this->assertSame(0, $data['summary']['failed']);
        $this->assertCount(2, $data['success']);
        $this->assertEmpty($data['failed']);
        foreach ($data['success'] as $entry) {
            $this->assertSame('confirmed', $entry['status']);
            $this->assertNotEmpty($entry['order_number']);
        }
        $this->assertSame('confirmed', $o1->fresh()->status);
        $this->assertSame('confirmed', $o2->fresh()->status);
    }

    public function test_bulk_mark_shipped_transitions_processing_orders(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->createOrder($store, ['status' => 'processing']);
        $o2 = $this->createOrder($store, ['status' => 'processing']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$o1->id, $o2->id],
            'action' => 'mark_shipped',
        ]);

        $res->assertStatus(200);
        $data = $res->json();
        $this->assertSame(2, $data['summary']['succeeded']);
        $this->assertSame('shipped', $o1->fresh()->status);
        $this->assertNotNull($o1->fresh()->shipped_at);
    }

    public function test_bulk_mark_delivered_transitions_shipped_orders(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->createOrder($store, ['status' => 'shipped']);
        $o2 = $this->createOrder($store, ['status' => 'processing']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$o1->id, $o2->id],
            'action' => 'mark_delivered',
        ]);

        $res->assertStatus(200);
        $data = $res->json();
        $this->assertSame(2, $data['summary']['succeeded']);
        $this->assertSame('delivered', $o1->fresh()->status);
        $this->assertSame('delivered', $o2->fresh()->status);
        $this->assertNotNull($o1->fresh()->delivered_at);
    }

    public function test_illegal_transitions_fail_per_order_without_blocking_batch(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $eligible = $this->createOrder($store, ['status' => 'pending']);
        // shipped cannot be "confirmed" per the canonical ALLOWED map
        $blocked = $this->createOrder($store, ['status' => 'shipped']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$eligible->id, $blocked->id],
            'action' => 'confirm',
        ]);

        $res->assertStatus(200);
        $data = $res->json();
        $this->assertSame(1, $data['summary']['succeeded']);
        $this->assertSame(1, $data['summary']['failed']);
        $this->assertSame('confirmed', $eligible->fresh()->status);
        $this->assertSame('shipped', $blocked->fresh()->status, 'ineligible order must stay untouched');
        $this->assertCount(1, $data['failed']);
        $this->assertSame($blocked->id, $data['failed'][0]['order_id']);
        $this->assertNotEmpty($data['failed'][0]['reason']);
    }

    public function test_cross_store_and_unknown_ids_are_rejected_without_leak(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $own = $this->createOrder($storeA, ['status' => 'pending']);
        $other = $this->createOrder($storeB, ['status' => 'pending']);
        $this->actingAs($userA);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$own->id, $other->id, 999999],
            'action' => 'confirm',
        ]);

        $res->assertStatus(200);
        $data = $res->json();
        $this->assertSame(1, $data['summary']['succeeded']);
        $this->assertSame(2, $data['summary']['failed']);
        // generic reason — no tenant/order existence leak
        $reasons = array_column($data['failed'], 'reason');
        foreach ($reasons as $reason) {
            $this->assertSame('الطلب غير موجود', $reason);
        }
        $this->assertSame('confirmed', $own->fresh()->status);
        $this->assertSame('pending', $other->fresh()->status, 'cross-store order must never be touched');
    }

    public function test_duplicate_ids_are_deduplicated_and_counted_once(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->createOrder($store, ['status' => 'pending']);
        $o2 = $this->createOrder($store, ['status' => 'pending']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$o1->id, $o1->id, $o2->id],
            'action' => 'confirm',
        ]);

        $res->assertStatus(200);
        $data = $res->json();
        $this->assertSame(2, $data['summary']['total']);
        $this->assertSame(2, $data['summary']['succeeded']);
        $this->assertCount(2, $data['success']);
    }

    public function test_each_valid_transition_dispatches_status_changed_event(): void
    {
        Event::fake([OrderStatusChanged::class]);
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->createOrder($store, ['status' => 'pending']);
        $o2 = $this->createOrder($store, ['status' => 'pending']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$o1->id, $o2->id],
            'action' => 'confirm',
        ]);

        $res->assertStatus(200);
        Event::assertDispatched(OrderStatusChanged::class, 2);
    }

    public function test_invalid_payload_returns_422(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->createOrder($store);
        $this->actingAs($user);

        $this->postJson(route('orders.bulk-status'), ['order_ids' => [], 'action' => 'confirm'])->assertStatus(422);
        $this->postJson(route('orders.bulk-status'), ['order_ids' => [$order->id]])->assertStatus(422);
        $this->postJson(route('orders.bulk-status'), ['order_ids' => [$order->id], 'action' => 'cancel'])->assertStatus(422);
        $this->postJson(route('orders.bulk-status'), ['order_ids' => ['abc'], 'action' => 'confirm'])->assertStatus(422);
        $this->postJson(route('orders.bulk-status'), ['order_ids' => range(1, 51), 'action' => 'confirm'])->assertStatus(422);
    }

    public function test_bulk_status_requires_edit_orders_permission(): void
    {
        $plan = Plan::factory()->create(['name' => 'Starter-' . uniqid(), 'price' => 9, 'themes' => ['all']]);
        // Permission exists in the catalog but the merchant is not granted it.
        Permission::create(['name' => 'edit-orders']);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_is_active' => true,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Test';
        $store->slug = 'test-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@e.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        $order = $this->createOrder($store, ['status' => 'pending']);
        $this->actingAs($user);

        $res = $this->postJson(route('orders.bulk-status'), [
            'order_ids' => [$order->id],
            'action' => 'confirm',
        ]);

        $res->assertStatus(403);
        $this->assertSame('pending', $order->fresh()->status, 'no transition must run without permission');
    }
}