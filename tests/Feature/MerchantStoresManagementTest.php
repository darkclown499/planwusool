<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Merchant store management hub — stores list + store overview.
 *
 * Focused on the redesigned merchant /stores and /stores/{id} pages:
 *   - lists render as Inertia components with real scoped stats
 *   - per-store aggregates are scoped to the merchant's own stores
 *   - readiness is derived from real data (never fabricated)
 *   - cross-tenant IDOR stays blocked on the detail route
 */
class MerchantStoresManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function makeCompanyStore(string $slug = null): array
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
        $user->givePermissionTo(['manage-stores', 'view-stores', 'edit-stores', 'settings-stores', 'delete-stores', 'create-stores']);

        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Store '.uniqid();
        $store->slug = $slug ?? 's-'.uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@'.uniqid().'.com';
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
            'status' => 'pending',
            'payment_status' => 'paid',
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
            'total_amount' => 120,
            'payment_method' => 'cod',
            'shipping_amount' => 20,
        ], $over));
    }

    private function makeProduct(Store $store): Product
    {
        return Product::create([
            'name' => 'Item '.uniqid(),
            'price' => 50,
            'stock' => 5,
            'store_id' => $store->id,
            'is_active' => true,
        ]);
    }

    private function makeShipping(Store $store): Shipping
    {
        return Shipping::create([
            'store_id' => $store->id,
            'name' => 'Flat '.uniqid(),
            'type' => 'flat_rate',
            'cost' => 10,
            'is_active' => true,
        ]);
    }

    // ---- Stores list renders with real scoped stats ----

    public function test_stores_index_renders_scoped_list_and_stats(): void
    {
        [$owner, $store] = $this->makeCompanyStore();
        $this->makeOrder($store, ['total_amount' => 200]);
        $this->makeOrder($store, ['total_amount' => 300, 'payment_status' => 'pending']);
        $this->makeProduct($store);
        Customer::create(['store_id' => $store->id, 'first_name' => 'C', 'last_name' => 'D', 'email' => 'c@'.uniqid().'.com', 'phone' => '059', 'is_active' => true]);

        $this->actingAs($owner);

        $this->get(route('stores.index'))
            ->assertStatus(200)
            ->assertInertia(function ($page) use ($store) {
                $page->component('stores/index')
                    ->has('stores', 1)
                    ->where('stores.0.id', $store->id)
                    ->has('storeStats')
                    ->where('storeStats.totalStores', 1);
            });
    }

    public function test_stores_index_exposes_real_per_store_aggregates(): void
    {
        [$owner, $store] = $this->makeCompanyStore();
        $this->makeOrder($store, ['total_amount' => 150]);
        $this->makeProduct($store);
        $this->makeProduct($store);

        $this->actingAs($owner);

        $this->get(route('stores.index'))
            ->assertInertia(function ($page) use ($store) {
                $page->component('stores/index')
                    ->where('stores.0.orders_count', 1)
                    ->where('stores.0.revenue', 150)
                    ->where('stores.0.products_count', 2)
                    ->where('storeStats.totalOrders', 1)
                    ->where('storeStats.totalRevenue', 150);
            });
    }

    // ---- Only own stores are listed ----

    public function test_stores_index_never_lists_other_merchant_stores(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyStore();
        [$ownerB, $storeB] = $this->makeCompanyStore();
        $this->makeOrder($storeB, ['total_amount' => 9999]);

        $this->actingAs($ownerA);

        $this->get(route('stores.index'))
            ->assertInertia(function ($page) use ($storeA) {
                $page->has('stores', 1)
                    ->where('stores.0.id', $storeA->id)
                    ->where('storeStats.totalOrders', 0);
            });
    }

    // ---- Store detail renders the hub with real readiness ----

    public function test_store_show_renders_hub_with_truthful_readiness(): void
    {
        [$owner, $store] = $this->makeCompanyStore();
        // Only products + shipping configured → NOT ready (payments missing).
        $this->makeProduct($store);
        $this->makeShipping($store);

        $this->actingAs($owner);

        $this->get(route('stores.show', $store->id))
            ->assertStatus(200)
            ->assertInertia(function ($page) use ($store) {
                $page->component('stores/view')
                    ->where('store.id', $store->id)
                    ->has('readiness')
                    ->where('readiness.products', true)
                    ->where('readiness.shipping', true)
                    ->where('readiness.payments', false)
                    ->where('readiness.isReady', false)
                    ->where('readiness.missing.0', 'طرق الدفع');
            });
    }

    public function test_store_show_marks_ready_when_products_shipping_payments_configured(): void
    {
        [$owner, $store] = $this->makeCompanyStore();
        $this->makeProduct($store);
        $this->makeShipping($store);
        // Enable a payment method for the store (real data, not fabricated).
        \App\Models\PaymentSetting::updateOrCreateSetting(
            $owner->id,
            'is_cod_enabled',
            '1',
            $store->id
        );

        $this->actingAs($owner);

        $this->get(route('stores.show', $store->id))
            ->assertInertia(function ($page) {
                $page->component('stores/view')
                    ->where('readiness.payments', true)
                    ->where('readiness.isReady', true);
            });
    }

    // ---- IDOR preserved on the redesigned detail page ----

    public function test_store_show_blocks_foreign_store(): void
    {
        [$ownerA] = $this->makeCompanyStore();
        [, $storeB] = $this->makeCompanyStore();
        $this->makeOrder($storeB, ['total_amount' => 333]);

        $this->actingAs($ownerA);

        $response = $this->get(route('stores.show', $storeB->id));
        $this->assertTrue(in_array($response->status(), [403, 404]), 'Expected 403/404, got '.$response->status());
    }
}
