<?php

namespace Tests\Feature;

use App\Models\DeliveryAssignment;
use App\Models\DeliveryDriver;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression tests for the delivery driver assignment + management UX.
 *
 * Covers:
 *   A. delivery board renders with zero drivers
 *   B. zero-driver state is represented in page props
 *   C. merchant can access driver management
 *   D. merchant can create a driver
 *   E. newly created active driver becomes eligible for assignment
 *   F. own-store driver ↔ own-store order assignment succeeds
 *   G. cross-store driver assignment is rejected
 *   H. cross-store order assignment is rejected
 *   I. inactive driver cannot be assigned
 *   J. customer-safe tracking does not leak private driver fields
 */
class DeliveryDriverAssignmentUxTest extends TestCase
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
            'name' => 'Pro-' . uniqid(),
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
        $store->name = 'Store ' . uniqid();
        $store->slug = $slugPrefix . '-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@' . uniqid() . '.com';
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
            'session_id' => 'sess-' . uniqid(),
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'customer_email' => 'cust@' . uniqid() . '.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0591' . rand(100000, 999999),
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

    private function makeDriver(Store $store, array $over = []): DeliveryDriver
    {
        return DeliveryDriver::create(array_merge([
            'store_id' => $store->id,
            'name' => 'محمد',
            'phone' => '+970591234567',
            'active' => true,
        ], $over));
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    // ────────────────────────────── A + B ──────────────────────────────

    public function test_delivery_board_renders_with_zero_drivers(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeOrder($store, ['delivery_status' => DeliveryAssignment::STATUS_UNASSIGNED]);

        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', $this->inertiaVersion())
            ->getJson(route('delivery.index'));

        $res->assertOk();
        $props = $res->json('props') ?? [];

        // Zero-driver state explicitly represented for the frontend.
        $this->assertArrayHasKey('drivers', $props);
        $this->assertCount(0, $props['drivers']);
        $this->assertArrayHasKey('orders', $props);
        $this->assertCount(1, $props['orders']['data'] ?? []);
    }

    // ────────────────────────────── C ──────────────────────────────

    public function test_merchant_can_access_driver_management(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeDriver($store, ['name' => 'سائق قابل للوصول']);

        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', $this->inertiaVersion())
            ->getJson(route('delivery.drivers.index'));

        $res->assertOk();
        $props = $res->json('props') ?? [];
        $this->assertCount(1, $props['drivers'] ?? []);
        $this->assertEquals('سائق قابل للوصول', ($props['drivers'][0]['name'] ?? ''));
    }

    // ────────────────────────────── D + E ──────────────────────────────

    public function test_merchant_can_create_driver_and_it_becomes_assignable(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeOrder($store);

        $this->actingAs($owner);
        $res = $this->postJson(route('delivery.drivers.store'), [
            'name' => 'سائق جديد',
            'phone' => '0599888888',
            'active' => true,
        ]);
        $res->assertStatus(302);

        $driver = DeliveryDriver::where('store_id', $store->id)->first();
        $this->assertNotNull($driver);
        $this->assertEquals('سائق جديد', $driver->name);

        // Newly created active driver becomes eligible for assignment (E).
        $order = Order::where('store_id', $store->id)->first();
        $assignRes = $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver->id]);
        $assignRes->assertOk();
        $this->assertEquals($driver->id, $order->fresh()->delivery_driver_id);
        $this->assertEquals(DeliveryAssignment::STATUS_ASSIGNED, $order->fresh()->delivery_status);
    }

    // ────────────────────────────── F ──────────────────────────────

    public function test_own_store_driver_assigned_to_own_store_order(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store, ['name' => 'سائق الخاص']);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        $res = $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver->id]);
        $res->assertOk();

        $order->refresh();
        $this->assertEquals($driver->id, $order->delivery_driver_id);
        $this->assertEquals(DeliveryAssignment::STATUS_ASSIGNED, $order->delivery_status);
    }

    // ────────────────────────────── G ──────────────────────────────

    public function test_cross_store_driver_assignment_rejected(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        $driverB = $this->makeDriver($storeB, ['name' => 'سائق من متجر آخر']);
        $orderA = $this->makeOrder($storeA);

        // Store A posts Store B's foreign driver_id.
        $this->actingAs($ownerA);
        $res = $this->postJson(route('delivery.orders.assign', $orderA->id), ['driver_id' => $driverB->id]);
        $res->assertStatus(422);
        $this->assertNull($orderA->fresh()->delivery_driver_id);
    }

    // ────────────────────────────── H ──────────────────────────────

    public function test_cross_store_order_assignment_rejected(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        $driverB = $this->makeDriver($storeB, ['name' => 'سائق ب']);
        $orderA = $this->makeOrder($storeA);

        // Store B user posts an assignment against Store A's order → 404 (foreign order).
        $this->actingAs($ownerB);
        $res = $this->postJson(route('delivery.orders.assign', $orderA->id), ['driver_id' => $driverB->id]);
        $res->assertStatus(404);
        $this->assertNull($orderA->fresh()->delivery_driver_id);
    }

    // ────────────────────────────── I ──────────────────────────────

    public function test_inactive_driver_cannot_be_assigned(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $driver = $this->makeDriver($store, ['active' => false]);
        $order = $this->makeOrder($store);

        $this->actingAs($owner);
        $res = $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver->id]);
        $res->assertStatus(422);
        $this->assertNull($order->fresh()->delivery_driver_id);
    }

    // ────────────────────────────── RETURN-TO-ASSIGN FLOW ──────────────────────────────

    public function test_create_driver_returns_to_delivery_board_when_internal_path_provided(): void
    {
        [$owner, $store] = $this->ownerWithStore();

        $this->actingAs($owner);
        $res = $this->post(route('delivery.drivers.store'), [
            'name' => 'سائق عائد',
            'active' => true,
            'return_to' => '/delivery',
        ]);

        // Internal return path honored → back to the delivery board.
        $res->assertRedirect('/delivery');
        $this->assertDatabaseHas('delivery_drivers', ['name' => 'سائق عائد']);
    }

    public function test_create_driver_ignores_external_open_redirect(): void
    {
        [$owner, $store] = $this->ownerWithStore();

        $this->actingAs($owner);
        $res = $this->post(route('delivery.drivers.store'), [
            'name' => 'سائق آمن',
            'active' => true,
            'return_to' => 'https://evil.example.com/phish',
        ]);

        // NOT redirected off-site — falls back to the drivers index.
        $res->assertRedirect(route('delivery.drivers.index'));
        $this->assertDatabaseHas('delivery_drivers', ['name' => 'سائق آمن']);
    }

    // ────────────────────────────── J ──────────────────────────────

    public function test_customer_tracking_does_not_leak_private_driver_fields(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $store->slug = 'track-slug-' . uniqid();
        $store->save();

        $driver = $this->makeDriver($store, [
            'name' => 'سائق سري',
            'phone' => '+970599111111',
            'notes' => 'ملاحظة داخلية سرية',
        ]);

        $customer = \App\Models\Customer::create([
            'store_id' => $store->id,
            'first_name' => 'عميل',
            'last_name' => 'تتبع',
            'email' => 'track@' . uniqid() . '.com',
            'password' => bcrypt('pass'),
            'is_active' => true,
        ]);

        $order = $this->makeOrder($store, ['customer_id' => $customer->id]);

        $this->actingAs($owner);
        $this->postJson(route('delivery.orders.assign', $order->id), ['driver_id' => $driver->id])->assertOk();

        // Track as the order's own customer via the public order-tracking API.
        $res = $this->actingAs($customer, 'customer')
            ->getJson(route('api.v1.orders.show', $order->order_number) . '?store_slug=' . $store->slug);
        $res->assertOk();

        $json = $res->json();
        $encoded = json_encode($json);

        // Driver private fields must NOT appear.
        $this->assertStringNotContainsString($driver->phone, $encoded ?? '');
        $this->assertStringNotContainsString($driver->notes ?? '', $encoded ?? '');
        $this->assertStringNotContainsString('سائق سري', $encoded ?? '');
        $this->assertArrayNotHasKey('driver', $json['order'] ?? []);
        $this->assertArrayNotHasKey('delivery_driver_id', $json['order'] ?? []);

        // Safe fields remain available.
        $this->assertEquals('assigned', $json['order']['delivery']['status'] ?? null);
    }
}
