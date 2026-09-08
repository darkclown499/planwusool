<?php

namespace Tests\Feature;

use App\Models\AdvancedCoupon;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use App\Models\StoreConfiguration;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P4A-02 — Shipping method default + server-authoritative fee.
 *
 * The storefront must never silently produce free shipping when an eligible,
 * active paid shipping method exists. The server resolves the canonical default
 * method when the client omits shipping_method_id (and no delivery zone is
 * selected), persists it, and bills the persisted server fee — never a
 * client-supplied amount.
 */
class ShippingChoiceAuthorityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // RefreshDatabase resets tables but StoreConfiguration instances its
        // request-level memoization statically, so reset it per test to keep the
        // free-shipping-threshold configuration from leaking across tests.
        StoreConfiguration::flushRequestCache();
    }

    private function ownerWithStore(bool $shippingEnabled = true): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Professional-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'enable_shipping_method' => $shippingEnabled ? 'on' : 'off',
        ]);

        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);

        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Test Store';
        $store->slug = 'test-store-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();

        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    private function createProduct(Store $store, Category $category): Product
    {
        return Product::create([
            'name' => 'Test Product ' . uniqid(),
            'price' => 100,
            'store_id' => $store->id,
            'category_id' => $category->id,
            'is_active' => true,
            'stock' => 10,
            'sku' => 'SKU-' . uniqid(),
        ]);
    }

    private function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
    }

    private function makeShipping(Store $store, array $attrs = []): Shipping
    {
        return Shipping::create(array_merge([
            'store_id' => $store->id,
            'name' => 'Standard Delivery ' . uniqid(),
            'cost' => 10,
            'handling_fee' => 0,
            'is_active' => true,
            'type' => 'flat_rate',
            'sort_order' => 0,
        ], $attrs));
    }

    private function createCustomerWithCart(Store $store, Product $product, int $qty = 1): Customer
    {
        $customer = Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'customer-' . uniqid() . '@example.com',
            'password' => bcrypt('pass'),
            'is_active' => true,
        ]);
        CartItem::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'session_id' => session()->getId(),
            'product_id' => $product->id,
            'quantity' => $qty,
            'price' => $product->price,
        ]);
        $this->actingAs($customer, 'customer');

        return $customer;
    }

    private function checkoutPayload(Store $store, ?int $shippingMethodId = null, array $overrides = []): array
    {
        $base = [
            'store_id' => $store->id,
            'customer_first_name' => 'Test',
            'customer_last_name' => 'User',
            'customer_email' => 'checkout-' . uniqid() . '@example.com',
            'customer_phone' => '0599000000',
            'shipping_address' => 'Test Street 123',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'shipping_postal_code' => '00970',
            'billing_address' => 'Test Street 123',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'billing_postal_code' => '00970',
            'payment_method' => 'cod',
            'shipping_method_id' => $shippingMethodId,
            'notes' => '',
        ];
        return array_merge($base, $overrides);
    }

    private function placeOrderUrl(Store $store): string
    {
        return route('store.order.place', ['storeSlug' => $store->slug]);
    }

    private function placeOrder(Store $store, array $payload): \Illuminate\Testing\TestResponse
    {
        return $this->postJson($this->placeOrderUrl($store), $payload);
    }

    private function latestOrder(Store $store): Order
    {
        return Order::where('store_id', $store->id)->latest('id')->firstOrFail();
    }

    // ─── Auto-selection & server-authoritative fee ─────────────────────────

    public function test_single_eligible_paid_method_is_auto_selected_and_charged(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $method = $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        $customer = $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertEquals($method->id, $order->shipping_method_id);
        $this->assertEquals(10, (float) $order->shipping_amount);
        $this->assertEquals(110, (float) $order->total_amount);
    }

    public function test_client_tampered_shipping_amount_is_ignored_and_server_fee_wins(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        // shipping_amount is not a validated/trusted field — a crafted 0 must not
        // override the authoritative server fee.
        $response = $this->placeOrder($store, $this->checkoutPayload($store, null, ['shipping_amount' => 0]));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertEquals(10, (float) $order->shipping_amount);
    }

    public function test_explicit_valid_method_selection_is_respected(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $default = $this->makeShipping($store, ['name' => 'A-Default', 'cost' => 10, 'sort_order' => 1, 'type' => 'flat_rate']);
        $chosen = $this->makeShipping($store, ['name' => 'B-Express', 'cost' => 25, 'sort_order' => 2, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store, $chosen->id));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertEquals($chosen->id, $order->shipping_method_id);
        $this->assertEquals(25, (float) $order->shipping_amount);
    }

    public function test_disabled_shipping_method_is_rejected(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $method = $this->makeShipping($store, ['cost' => 10, 'is_active' => false]);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store, $method->id));
        $response->assertStatus(422);
        $this->assertDatabaseMissing('orders', ['store_id' => $store->id]);
    }

    public function test_foreign_store_shipping_method_is_rejected(): void
    {
        [$owner, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();
        $methodB = $this->makeShipping($storeB, ['cost' => 10]);
        $this->createCustomerWithCart($storeA, $this->createProduct($storeA, $this->category($storeA)));

        $response = $this->placeOrder($storeA, $this->checkoutPayload($storeA, $methodB->id));
        $response->assertStatus(422);
        $this->assertDatabaseMissing('orders', ['store_id' => $storeA->id]);
    }

    public function test_fee_uses_current_persisted_price_not_stale_client_input(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $method = $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        // Merchant raises the price after the storefront list loaded.
        $method->forceFill(['cost' => 25])->save();

        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));
        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200);

        $order = $this->latestOrder($store);
        $this->assertEquals(25, (float) $order->shipping_amount);
    }

    public function test_handling_fee_is_included_in_flat_fee(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeShipping($store, ['cost' => 10, 'handling_fee' => 5, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200);

        $order = $this->latestOrder($store);
        $this->assertEquals(15, (float) $order->shipping_amount);
    }

    public function test_percentage_based_fee_computed_from_subtotal(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $method = $this->makeShipping($store, ['cost' => 10, 'type' => 'percentage_based']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store))); // subtotal 100

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200);

        $order = $this->latestOrder($store);
        $this->assertEquals($method->id, $order->shipping_method_id);
        $this->assertEquals(10, (float) $order->shipping_amount); // 10% of 100
    }

    // ─── Canonical default policy (free priority / ordering) ───────────────

    public function test_free_shipping_type_is_preferred_over_paid_method(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $paid = $this->makeShipping($store, ['name' => 'Paid', 'cost' => 10, 'sort_order' => 1, 'type' => 'flat_rate']);
        $free = $this->makeShipping($store, ['name' => 'Free', 'cost' => 0, 'sort_order' => 2, 'type' => 'free_shipping']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200);

        $order = $this->latestOrder($store);
        $this->assertEquals($free->id, $order->shipping_method_id);
        $this->assertEquals(0, (float) $order->shipping_amount);
        $this->assertEquals(100, (float) $order->total_amount);
    }

    public function test_zero_cost_flat_is_treated_as_free_and_preferred_over_paid(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $paid = $this->makeShipping($store, ['name' => 'Paid', 'cost' => 10, 'sort_order' => 1, 'type' => 'flat_rate']);
        $zero = $this->makeShipping($store, ['name' => 'Zero', 'cost' => 0, 'handling_fee' => 0, 'sort_order' => 2, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200);

        $order = $this->latestOrder($store);
        $this->assertEquals($zero->id, $order->shipping_method_id);
        $this->assertEquals(0, (float) $order->shipping_amount);
    }

    public function test_first_method_by_sort_order_when_no_free_method_exists(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $later = $this->makeShipping($store, ['name' => 'Z-Expensive', 'cost' => 10, 'sort_order' => 2, 'type' => 'flat_rate']);
        $first = $this->makeShipping($store, ['name' => 'A-Cheap', 'cost' => 5, 'sort_order' => 1, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200);

        $order = $this->latestOrder($store);
        $this->assertEquals($first->id, $order->shipping_method_id);
        $this->assertEquals(5, (float) $order->shipping_amount);
    }

    // ─── No-method / entitlement edge cases ────────────────────────────────

    public function test_no_methods_store_keeps_zero_shipping(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertNull($order->shipping_method_id);
        $this->assertEquals(0, (float) $order->shipping_amount);
        $this->assertEquals(100, (float) $order->total_amount);
    }

    public function test_plan_without_shipping_never_auto_selects(): void
    {
        [$owner, $store] = $this->ownerWithStore(false);
        // A shipping row exists, but the plan does not include the feature.
        $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertNull($order->shipping_method_id);
        $this->assertEquals(0, (float) $order->shipping_amount);
        $this->assertEquals(100, (float) $order->total_amount);
    }

    public function test_free_shipping_threshold_zeroes_fee_but_keeps_method_selection(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $method = $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        StoreConfiguration::updateConfiguration($store->id, [
            'free_shipping_enabled' => true,
            'free_shipping_threshold' => 50,
        ]);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store))); // subtotal 100 >= 50

        $response = $this->placeOrder($store, $this->checkoutPayload($store));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertEquals($method->id, $order->shipping_method_id);
        $this->assertEquals(0, (float) $order->shipping_amount);
        $this->assertEquals(100, (float) $order->total_amount);
    }

    public function test_free_shipping_coupon_zeroes_fee_but_keeps_method_selection(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $method = $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        $coupon = AdvancedCoupon::create([
            'store_id' => $store->id,
            'name' => 'Ship Free',
            'code' => 'SHIPFREE-' . uniqid(),
            'code_type' => 'manual',
            'discount_type' => 'free_shipping',
            'discount_value' => 0,
            'status' => true,
            'audience' => 'everyone',
            'created_by' => $owner->id,
        ]);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store, null, ['coupon_code' => $coupon->code]));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertEquals($method->id, $order->shipping_method_id);
        $this->assertEquals(0, (float) $order->shipping_amount);
        $this->assertEquals(100, (float) $order->total_amount);
    }

    // ─── Delivery zone interplay ───────────────────────────────────────────

    public function test_selected_delivery_zone_is_authoritative_and_skips_method_default(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        $zone = DeliveryZone::create([
            'store_id' => $store->id,
            'name' => 'Downtown',
            'fee' => 20,
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store)));

        $response = $this->placeOrder($store, $this->checkoutPayload($store, null, ['delivery_zone_id' => $zone->id]));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($store);
        $this->assertNull($order->shipping_method_id);
        $this->assertEquals($zone->id, $order->delivery_zone_id);
        $this->assertEquals(20, (float) $order->shipping_amount);
        $this->assertEquals(120, (float) $order->total_amount);
    }

    public function test_ineligible_zone_still_rejected_when_method_available(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $this->makeShipping($store, ['cost' => 10, 'type' => 'flat_rate']);
        $zone = DeliveryZone::create([
            'store_id' => $store->id,
            'name' => 'Far Zone',
            'fee' => 20,
            'min_order_amount' => 500,
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $this->createCustomerWithCart($store, $this->createProduct($store, $this->category($store))); // subtotal 100 < 500

        $response = $this->placeOrder($store, $this->checkoutPayload($store, null, ['delivery_zone_id' => $zone->id]));
        $response->assertStatus(422);
        $this->assertDatabaseMissing('orders', ['store_id' => $store->id]);
    }

    // ─── Registration/Tenant invariants (T2-A parity) ──────────────────────

    public function test_auto_selection_never_leaks_foreign_store_method(): void
    {
        [$owner, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();
        $this->makeShipping($storeA, ['cost' => 10, 'type' => 'flat_rate']);
        $this->makeShipping($storeB, ['cost' => 99, 'type' => 'flat_rate']);
        $this->createCustomerWithCart($storeA, $this->createProduct($storeA, $this->category($storeA)));

        $response = $this->placeOrder($storeA, $this->checkoutPayload($storeA));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = $this->latestOrder($storeA);
        // Must resolve store A's own method (10), never store B's.
        $this->assertEquals(10, (float) $order->shipping_amount);
        $this->assertEquals($storeA->id, $order->shippingMethod()->first()->store_id);
    }
}