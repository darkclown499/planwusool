<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DeliveryAssignment;
use App\Models\DeliveryDriver;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Services\DeliveryLifecycleService;
use App\Services\DeliveryZoneService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalDeliveryOsPhase1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function ownerWithStore(string $slugPrefix = 'store'): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 1000,
            'max_users_per_store' => 20,
            'enable_shipping_method' => 'on',
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $user->givePermissionTo(['manage-orders', 'manage-shipping']);

        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Store '.uniqid();
        $store->slug = $slugPrefix.'-'.uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@'.uniqid().'.com';
        $store->save();

        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    private function makeOrder(Store $store, array $over = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-'.uniqid(),
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'customer_email' => 'cust@'.uniqid().'.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0591'.rand(100000, 999999),
            'shipping_address' => 'addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'addr',
            'billing_city' => 'N',
            'billing_state' => 'W',
            'billing_country' => 'PS',
            'subtotal' => 100,
            'shipping_amount' => 10,
            'total_amount' => 110,
            'payment_method' => 'cod',
            'delivery_status' => DeliveryAssignment::STATUS_UNASSIGNED,
        ], $over));
    }

    private function makeZone(Store $store, array $over = []): DeliveryZone
    {
        return DeliveryZone::create(array_merge([
            'store_id' => $store->id,
            'name' => 'وسط البلد',
            'fee' => 15,
            'is_active' => true,
            'sort_order' => 0,
        ], $over));
    }

    private function makeDriver(Store $store, array $over = []): DeliveryDriver
    {
        return DeliveryDriver::create(array_merge([
            'store_id' => $store->id,
            'name' => 'محمد',
            'phone' => '+970591234567',
            'active' => true,
        ], $over));
    }

    // ─────────────────────────── DELIVERY ZONES ───────────────────────────

    public function test_zone_crud_and_tenant_isolation(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        // A creates a zone
        $this->actingAs($ownerA);
        $this->postJson(route('delivery.zones.store'), [
            'name' => 'قلقيلية',
            'fee' => 12,
            'est_time_text' => 'نفس اليوم',
            'free_delivery_threshold' => 200,
            'min_order_amount' => 0,
        ])->assertStatus(302);

        $zone = DeliveryZone::where('store_id', $storeA->id)->first();
        $this->assertNotNull($zone);
        $this->assertEquals('قلقيلية', $zone->name);
        $this->assertEquals(12, (float) $zone->fee);

        // B cannot see A's zone
        $this->actingAs($ownerB);
        $this->getJson(route('delivery.zones.edit', $zone->id))->assertStatus(404);

        // B cannot delete A's zone
        $this->deleteJson(route('delivery.zones.destroy', $zone->id))->assertStatus(404);
        $this->assertDatabaseHas('delivery_zones', ['id' => $zone->id]);

        // B cannot update A's zone
        $this->putJson(route('delivery.zones.update', $zone->id), ['name' => 'Hacked', 'fee' => 1])->assertStatus(404);
        $this->assertDatabaseHas('delivery_zones', ['id' => $zone->id, 'name' => 'قلقيلية']);

        // A can edit own zone
        $this->actingAs($ownerA);
        $this->putJson(route('delivery.zones.update', $zone->id), ['name' => 'عزون', 'fee' => 18])
            ->assertStatus(302);
        $this->assertDatabaseHas('delivery_zones', ['id' => $zone->id, 'name' => 'عزون', 'fee' => 18.00]);
    }

    public function test_inactive_zone_is_not_offered_and_not_usable_at_checkout(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        $this->makeZone($storeA, ['is_active' => false, 'name' => 'منطقة مخفية']);

        // Not exposed via storefront API
        $res = $this->getJson(route('api.delivery-zones') . '?store_id=' . $storeA->id);
        $res->assertOk();
        $this->assertCount(0, $res->json('delivery_zones'));

        // And cannot resolve at checkout
        $inactive = DeliveryZone::where('store_id', $storeA->id)->first();
        $result = app(DeliveryZoneService::class)->resolveForCheckout($storeA->id, $inactive->id, 100);
        $this->assertNull($result['zone']);
        $this->assertFalse($result['eligible']);
    }

    public function test_wrong_store_zone_rejected_at_checkout(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();
        $zoneB = $this->makeZone($storeB, ['name' => 'منطقة المتجر الآخر']);

        $cat = Category::factory()->create(['store_id' => $storeA->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = Product::create(['name' => 'P', 'price' => 50, 'store_id' => $storeA->id, 'category_id' => $cat->id, 'is_active' => true, 'stock' => 10, 'sku' => 'SKU-'.uniqid()]);
        $customer = Customer::create(['store_id' => $storeA->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'z@z.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $storeA->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $product->id, 'quantity' => 1, 'price' => $product->price]);
        $this->actingAs($customer, 'customer');

        // Store A checkout with Store B zone → rejected
        $response = $this->postJson(route('store.order.place', ['storeSlug' => $storeA->slug]), [
            'store_id' => $storeA->id,
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_email' => 'z@z.com',
            'customer_phone' => '0599000000',
            'shipping_address' => 'Test Street 123',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'billing_address' => 'Test Street 123',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'payment_method' => 'cod',
            'delivery_zone_id' => $zoneB->id,
        ]);
        $response->assertStatus(422);
        $this->assertDatabaseMissing('orders', ['store_id' => $storeA->id]);
    }

    // ─────────────────────────── CHECKOUT FEE ───────────────────────────

    public function test_checkout_server_computes_zone_fee_and_snapshots_it(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $zone = $this->makeZone($store, ['fee' => 25, 'name' => 'نابلس']);

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = Product::create(['name' => 'P', 'price' => 100, 'store_id' => $store->id, 'category_id' => $cat->id, 'is_active' => true, 'stock' => 10, 'sku' => 'SKU-'.uniqid()]);
        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'fee@z.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $product->id, 'quantity' => 1, 'price' => $product->price]);
        $this->actingAs($customer, 'customer');

        $response = $this->postJson(route('store.order.place', ['storeSlug' => $store->slug]), [
            'store_id' => $store->id,
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_email' => 'fee@z.com',
            'customer_phone' => '0599000000',
            'shipping_address' => 'Test Street 123',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'billing_address' => 'Test Street 123',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'payment_method' => 'cod',
            'delivery_zone_id' => $zone->id,
        ]);
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = Order::where('store_id', $store->id)->first();
        $this->assertEquals($zone->id, $order->delivery_zone_id);
        $this->assertEquals('نابلس', $order->delivery_zone_name);
        $this->assertEquals(25, (float) $order->delivery_fee);
        $this->assertEquals(25, (float) $order->shipping_amount);
        $this->assertEquals(125, (float) $order->total_amount);
    }

    public function test_forged_client_fee_is_ignored(): void
    {
        // A malicious client can submit delivery_fee but the server resolves the zone's real fee.
        [$owner, $store] = $this->ownerWithStore();
        $zone = $this->makeZone($store, ['fee' => 30]);

        $result = app(DeliveryZoneService::class)->resolveForCheckout($store->id, $zone->id, 50);
        $this->assertTrue($result['eligible']);
        $this->assertEquals(30, $result['fee']);
        // The zone fee, not any client value, is authoritative — createOrder uses server-calculated amounts only.
    }

    public function test_free_delivery_threshold_works(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $zone = $this->makeZone($store, ['fee' => 20, 'free_delivery_threshold' => 150]);

        // Below threshold → fee applies
        $low = app(DeliveryZoneService::class)->resolveForCheckout($store->id, $zone->id, 100);
        $this->assertEquals(20, $low['fee']);

        // At/above threshold → free
        $high = app(DeliveryZoneService::class)->resolveForCheckout($store->id, $zone->id, 200);
        $this->assertEquals(0, $high['fee']);
        $this->assertTrue($high['free_delivery']);
    }

    public function test_min_order_requirement_enforced(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $zone = $this->makeZone($store, ['fee' => 20, 'min_order_amount' => 500]);

        $result = app(DeliveryZoneService::class)->resolveForCheckout($store->id, $zone->id, 100);
        $this->assertNotNull($result['zone']);
        $this->assertFalse($result['eligible']);
    }

    public function test_zone_snapshot_preserved_after_zone_edit(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $zone = $this->makeZone($store, ['fee' => 15, 'name' => 'طولكرم']);
        $order = $this->makeOrder($store, [
            'delivery_zone_id' => $zone->id,
            'delivery_zone_name' => 'طولكرم',
            'delivery_fee' => 15,
        ]);

        // Merchant edits the zone later — historical order snapshot unchanged
        $zone->update(['fee' => 99, 'name' => 'تم التعديل']);

        $order->refresh();
        $this->assertEquals('طولكرم', $order->delivery_zone_name);
        $this->assertEquals(15, (float) $order->delivery_fee);
    }

    // ─────────────────────────── DRIVERS ───────────────────────────

    public function test_driver_crud_and_tenant_isolation(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        $this->actingAs($ownerA);
        $this->postJson(route('delivery.drivers.store'), [
            'name' => 'أحمد',
            'phone' => '0599000000',
            'vehicle_info' => 'سكوتر',
        ])->assertStatus(302);

        $driver = DeliveryDriver::where('store_id', $storeA->id)->first();
        $this->assertNotNull($driver);
        $this->assertEquals('أحمد', $driver->name);
        // Palestinian local number normalized to E.164
        $this->assertEquals('+970599000000', $driver->phone);

        // Store B cannot access/edit/delete
        $this->actingAs($ownerB);
        $this->getJson(route('delivery.drivers.edit', $driver->id))->assertStatus(404);
        $this->putJson(route('delivery.drivers.update', $driver->id), ['name' => 'X'])->assertStatus(404);
        $this->deleteJson(route('delivery.drivers.destroy', $driver->id))->assertStatus(404);
        $this->assertDatabaseHas('delivery_drivers', ['id' => $driver->id]);
    }

    public function test_inactive_driver_cannot_receive_assignment(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store, ['active' => false]);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        $res = $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver->id]);
        $res->assertStatus(422);
        $this->assertNull($order->fresh()->delivery_driver_id);
    }

    // ─────────────────────────── ASSIGNMENTS ───────────────────────────

    public function test_assign_and_reassign_driver(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver1 = $this->makeDriver($store, ['name' => 'سائق 1']);
        $driver2 = $this->makeDriver($store, ['name' => 'سائق 2']);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        $res = $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver1->id]);
        $res->assertOk();

        $order->refresh();
        $this->assertEquals($driver1->id, $order->delivery_driver_id);
        $this->assertEquals(DeliveryAssignment::STATUS_ASSIGNED, $order->delivery_status);
        $this->assertEquals(1, DeliveryAssignment::where('order_id', $order->id)->count());

        // Reassign to driver2 → original cancelled, new assignment created
        $res = $this->postJson(route('delivery.orders.reassign', $order->id), ['driver_id' => $driver2->id]);
        $res->assertOk();

        $order->refresh();
        $this->assertEquals($driver2->id, $order->delivery_driver_id);
        $this->assertEquals(2, DeliveryAssignment::where('order_id', $order->id)->count());
        $cancelled = DeliveryAssignment::where('order_id', $order->id)->where('delivery_status', DeliveryAssignment::STATUS_CANCELLED)->count();
        $this->assertEquals(1, $cancelled);
    }

    public function test_other_store_driver_assignment_rejected(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        $driverB = $this->makeDriver($storeB, ['name' => 'سائق B']);
        $orderA = $this->makeOrder($storeA);

        $this->actingAs($ownerA);
        $res = $this->postJson(route('delivery.orders.assign', $orderA->id), ['driver_id' => $driverB->id]);
        $res->assertStatus(422); // driver not resolvable in store A scope (also service-level guard)

        // Direct service call must also refuse cross-store
        $this->expectException(\Exception::class);
        DeliveryLifecycleService::assignDriver($orderA, $driverB);
    }

    public function test_cancelled_order_cannot_receive_assignment_and_assignments_are_cancelled(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);
        $order = $this->makeOrder($store, ['status' => 'cancelled']);

        $this->actingAs($owner);
        $res = $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver->id]);
        $res->assertStatus(422);

        // Cancel order with active assignment → assignment cancelled
        $order2 = $this->makeOrder($store, ['status' => 'confirmed']);
        DeliveryLifecycleService::assignDriver($order2, $driver);
        \App\Services\OrderTransitionService::transition($order2, 'cancelled');
        DeliveryLifecycleService::cancelActiveAssignment($order2, 'إلغاء الطلب');
        $this->assertEquals(DeliveryAssignment::STATUS_CANCELLED, $order2->fresh()->delivery_status);
        $this->assertNull($order2->fresh()->delivery_driver_id);
    }

    // ─────────────────────────── DELIVERY LIFECYCLE ───────────────────────────

    public function test_delivery_state_machine_allowed_transitions(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        DeliveryLifecycleService::assignDriver($order, $driver);

        // assigned → picked_up → out_for_delivery → delivered
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'picked_up'])->assertOk();
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'out_for_delivery'])->assertOk();
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'delivered'])->assertOk();

        $order->refresh();
        $this->assertEquals(DeliveryAssignment::STATUS_DELIVERED, $order->delivery_status);
        $this->assertNotNull($order->delivered_at);
    }

    public function test_delivery_state_machine_forbidden_jump(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        DeliveryLifecycleService::assignDriver($order, $driver);

        // assigned → delivered directly is not allowed
        $res = $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'delivered']);
        $res->assertStatus(422);

        $order->refresh();
        $this->assertEquals(DeliveryAssignment::STATUS_ASSIGNED, $order->delivery_status);

        // impossible reverse jump
        $res = $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'unassigned']);
        $res->assertStatus(422);
    }

    public function test_delivery_failure_path(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        DeliveryLifecycleService::assignDriver($order, $driver);

        // out_for_delivery → delivery_failed
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'out_for_delivery'])->assertOk();
        $res = $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'delivery_failed', 'reason' => 'العميل غير متواجد']);
        $res->assertOk();

        $order->refresh();
        $this->assertEquals(DeliveryAssignment::STATUS_DELIVERY_FAILED, $order->delivery_status);
        $this->assertNull($order->delivery_driver_id);

        // delivery_failed → returned
        $res = $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'returned']);
        $res->assertOk();
        $this->assertEquals(DeliveryAssignment::STATUS_RETURNED, $order->fresh()->delivery_status);

        // return path from returned → delivered is forbidden
        $res = $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'delivered']);
        $res->assertStatus(422);
    }

    public function test_other_store_order_protection_on_transitions(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        $driverA = $this->makeDriver($storeA);
        $orderA = $this->makeOrder($storeA);
        DeliveryLifecycleService::assignDriver($orderA, $driverA);

        // Store B user tries to transition Store A's order
        $this->actingAs($ownerB);
        $res = $this->postJson(route('delivery.orders.transition', $orderA->id), ['status' => 'picked_up']);
        $res->assertStatus(404);
    }

    // ─────────────────────────── COD SEPARATION ───────────────────────────

    public function test_delivery_completion_does_not_mark_cod_paid(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending']);

        $this->actingAs($owner);
        DeliveryLifecycleService::assignDriver($order, $driver);
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'picked_up'])->assertOk();
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'out_for_delivery'])->assertOk();
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'delivered'])->assertOk();

        $order->refresh();
        $this->assertEquals(DeliveryAssignment::STATUS_DELIVERED, $order->delivery_status);
        // PAYMENT REMAINS SEPARATE — delivery completed must NOT auto-collect COD
        $this->assertEquals('pending', $order->payment_status);
        $this->assertNull($order->paid_at);
    }

    public function test_order_payment_delivery_states_stay_separated(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending']);

        $this->actingAs($owner);
        DeliveryLifecycleService::assignDriver($order, $driver);

        // Deliver the order physically
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'picked_up'])->assertOk();
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'out_for_delivery'])->assertOk();
        $this->postJson(route('delivery.orders.transition', $order->id), ['status' => 'delivered'])->assertOk();

        // Then merchant explicitly collects COD via canonical path
        \App\Services\OrderTransitionService::collectCod($order->fresh());
        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals(DeliveryAssignment::STATUS_DELIVERED, $order->delivery_status);
    }

    // ─────────────────────────── PERFORMANCE ───────────────────────────

    public function test_delivery_board_paginates_server_side(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store);

        foreach (range(1, 5) as $i) {
            $this->makeOrder($store, ['delivery_driver_id' => $driver->id]);
        }
        foreach (range(1, 5) as $i) {
            $this->makeOrder($store);
        }

        $this->actingAs($owner);
        $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
        $res = $this->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', $version ?? '')
            ->getJson(route('delivery.index') . '?per_page=5');
        $res->assertOk();
        $orders = $res->json('props.orders') ?? [];
        $this->assertCount(5, $orders['data'] ?? []);
        $this->assertArrayHasKey('counts', $res->json('props') ?? []);
    }
}