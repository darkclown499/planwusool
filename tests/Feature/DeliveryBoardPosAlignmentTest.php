<?php

namespace Tests\Feature;

use App\Models\DeliveryAssignment;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Delivery board "غير معيّن" alignment (audit P3).
 *
 * A completed POS walk-in sale (status=delivered, payment_status=paid,
 * order_source=pos) keeps delivery_status='unassigned'. It needs NO driver, so
 * it must neither appear as a card nor be counted in the unassigned column.
 * The bucket count and the card query share DeliveryController::
 * OPERATIONAL_DELIVERY_STATUSES so they can never drift apart again.
 */
class DeliveryBoardPosAlignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 100, 'max_users_per_store' => 20]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'plan_id' => $plan->id, 'plan_is_active' => 1, 'plan_expire_date' => now()->addYear(), 'onboarded_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();
        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(Permission::all());
        $user->assignRole($role);

        return [$user->fresh(), $store];
    }

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'session_id' => 'sess-' . uniqid(),
            'status' => 'confirmed', 'payment_status' => 'pending', 'payment_method' => 'cod',
            'customer_email' => 'b@' . uniqid() . '.com', 'customer_first_name' => 'B', 'customer_last_name' => 'D',
            'customer_phone' => '0591000000', 'shipping_address' => 'addr', 'shipping_city' => 'Nablus',
            'shipping_state' => 'WB', 'shipping_country' => 'PS', 'billing_address' => 'addr',
            'billing_city' => 'N', 'billing_state' => 'W', 'billing_country' => 'PS',
            'subtotal' => 100, 'shipping_amount' => 10, 'total_amount' => 110,
            'created_at' => now(), 'delivery_status' => DeliveryAssignment::STATUS_UNASSIGNED,
        ], $overrides));
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    public function test_completed_pos_sale_is_absent_from_unassigned_board_and_count(): void
    {
        [$owner, $store] = $this->ownerWithStore();

        // In-flight storefront order — must stay on the operational board.
        $this->makeOrder($store, ['total_amount' => 110, 'status' => 'confirmed']);

        // Completed POS walk-in sale — delivered & collected, no driver needed.
        $this->makeOrder($store, [
            'order_source' => 'pos',
            'payment_method' => 'cash',
            'status' => 'delivered',
            'payment_status' => 'paid',
            'total_amount' => 99,
        ]);

        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia', 'true')->withHeader('X-Inertia-Version', $this->inertiaVersion())
            ->getJson(route('delivery.index') . '?tab=orders&bucket=unassigned');

        $res->assertOk();
        $props = $res->json('props') ?? [];

        $this->assertSame(1, $props['counts']['unassigned'], 'completed POS sale must not count in unassigned');

        $cards = collect($props['orders']['data'] ?? []);
        $this->assertSame(1, $cards->count(), 'cards must match the unassigned count (1 vs 2 pre-fix)');
        foreach ($cards as $card) {
            $this->assertTrue(
                in_array($card['status'], ['pending', 'confirmed', 'processing', 'shipped'], true),
                'a board card must be an in-flight order, got status=' . ($card['status'] ?? 'null')
            );
        }
    }

    public function test_unassigned_bucket_count_equals_number_of_cards(): void
    {
        [$owner, $store] = $this->ownerWithStore();

        // Three in-flight + one completed POS (should be filtered out of both).
        foreach ([100, 200, 300] as $i => $amount) {
            $this->makeOrder($store, ['total_amount' => $amount, 'status' => 'processing']);
        }
        $this->makeOrder($store, [
            'order_source' => 'pos', 'status' => 'delivered', 'payment_status' => 'paid',
            'total_amount' => 400,
        ]);

        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia', 'true')->withHeader('X-Inertia-Version', $this->inertiaVersion())
            ->getJson(route('delivery.index') . '?tab=orders&bucket=unassigned');

        $res->assertOk();
        $props = $res->json('props') ?? [];

        $this->assertSame(3, $props['counts']['unassigned']);
        $this->assertSame(3, count($props['orders']['data'] ?? []), 'count and cards must stay in sync');
    }
}