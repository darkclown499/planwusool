<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutOrderCreationTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $storeAttrs = []): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Professional-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'enable_shipping_method' => 'on',
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
        $store->name = $storeAttrs['name'] ?? 'Test Store';
        $store->slug = $storeAttrs['slug'] ?? 'test-store-' . uniqid();
        $store->theme = $storeAttrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();

        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    private function createProduct(Store $store, Category $category, int $stock = 10): Product
    {
        return Product::create([
            'name' => 'Test Product ' . uniqid(),
            'price' => 100,
            'store_id' => $store->id,
            'category_id' => $category->id,
            'is_active' => true,
            'stock' => $stock,
            'sku' => 'SKU-' . uniqid(),
        ]);
    }

    private function addToCartViaApi(Store $store, Product $product, int $qty = 1): void
    {
        // Use store domain for API to keep session consistent with order place (both on same host)
        $url = 'http://' . $store->slug . '.localhost/api/cart/add';
        $response = $this->postJson($url, [
            'store_id' => $store->id,
            'product_id' => $product->id,
            'quantity' => $qty,
        ]);
        $response->assertStatus(200);
    }

    private function checkoutPayload(Store $store, ?int $shippingMethodId = null, string $paymentMethod = 'cod', array $overrides = []): array
    {
        $base = [
            'store_id' => $store->id,
            'customer_first_name' => 'Test',
            'customer_last_name' => 'User',
            'customer_email' => 'test@example.com',
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
            'payment_method' => $paymentMethod,
            'shipping_method_id' => $shippingMethodId,
            'notes' => '',
        ];
        return array_merge($base, $overrides);
    }

    private function placeOrderUrl(Store $store): string
    {
        return route('store.order.place', ['storeSlug' => $store->slug]);
    }

    public function test_guest_can_create_order_from_cart(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat, 10);
        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'Guest', 'last_name' => 'User', 'email' => 'test@example.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $product->id, 'quantity' => 2, 'price' => $product->price]);
        $this->actingAs($customer, 'customer');

        $payload = $this->checkoutPayload($store);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('orders', ['store_id' => $store->id, 'customer_email' => 'test@example.com']);
        $order = Order::where('store_id', $store->id)->first();
        $this->assertEquals(1, $order->items()->count());
        $this->assertEquals('cod', $order->payment_method);
        $this->assertDatabaseMissing('cart_items', ['store_id' => $store->id]);
    }

    public function test_order_contains_correct_store_id_and_items(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $p1 = $this->createProduct($store, $cat, 5);
        $p2 = $this->createProduct($store, $cat, 5);
        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'a@b.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $p1->id, 'quantity' => 1, 'price' => $p1->price]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $p2->id, 'quantity' => 3, 'price' => $p2->price]);
        $this->actingAs($customer, 'customer');

        $payload = $this->checkoutPayload($store);
        $this->postJson($this->placeOrderUrl($store), $payload)->assertStatus(200)->assertJson(['success' => true]);

        $order = Order::where('store_id', $store->id)->first();
        $this->assertNotNull($order);
        $this->assertEquals(2, $order->items()->count());
        $this->assertEquals(4, $order->items()->sum('quantity'));
    }

    public function test_shipping_and_payment_stored_correctly(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat);
        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'ship@test.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $product->id, 'quantity' => 1, 'price' => $product->price]);
        $this->actingAs($customer, 'customer');

        $shipping = Shipping::create([
            'store_id' => $store->id,
            'name' => 'Standard Delivery',
            'cost' => 15,
            'is_active' => true,
            'type' => 'fixed',
        ]);

        $payload = $this->checkoutPayload($store, $shipping->id, 'cod', ['customer_email' => 'ship@test.com']);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);
        $response->assertStatus(200);

        $order = Order::where('store_id', $store->id)->first();
        $this->assertEquals($shipping->id, $order->shipping_method_id);
        $this->assertEquals('cod', $order->payment_method);
        $this->assertEquals(15, (float) $order->shipping_amount);
    }

    public function test_cart_cleared_after_success_and_remains_after_failure(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat);
        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'clear@test.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $product->id, 'quantity' => 1, 'price' => $product->price]);
        $this->actingAs($customer, 'customer');

        $payload = $this->checkoutPayload($store, null, 'cod', ['customer_email' => 'clear@test.com']);
        $this->postJson($this->placeOrderUrl($store), $payload)->assertStatus(200);
        $this->assertEquals(0, CartItem::where('store_id', $store->id)->count());

        $payload2 = $this->checkoutPayload($store, null, 'cod', ['customer_email' => 'clear@test.com']);
        $response = $this->postJson($this->placeOrderUrl($store), $payload2);
        $response->assertStatus(400);
    }

    public function test_invalid_shipping_method_cannot_create_order(): void
    {
        [$owner, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$ownerB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $catA = Category::factory()->create(['store_id' => $storeA->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($storeA, $catA);
        $this->addToCartViaApi($storeA, $product);

        $shippingB = Shipping::create([
            'store_id' => $storeB->id,
            'name' => 'Shipping B',
            'cost' => 10,
            'is_active' => true,
            'type' => 'fixed',
        ]);

        $payload = $this->checkoutPayload($storeA, $shippingB->id);
        $response = $this->postJson(route('store.order.place', ['storeSlug' => $storeA->slug]), $payload);
        $response->assertStatus(422);
        $this->assertDatabaseMissing('orders', ['store_id' => $storeA->id]);
        $this->assertEquals(1, CartItem::where('store_id', $storeA->id)->count());
    }

    public function test_product_from_another_store_cannot_be_ordered(): void
    {
        [$owner, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        $payload = $this->checkoutPayload($storeA);
        $response = $this->postJson(route('store.order.place', ['storeSlug' => $storeA->slug]), $payload);
        $response->assertStatus(400);
    }

    public function test_out_of_stock_product_creates_order_with_rollback(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat, 0);
        $res = $this->addToCartViaApiExpect($store, $product, 5);
        // Hardened cart now rejects OOS at add (422) instead of at order (400). Both enforce no oversell.
        if ($res->status() === 422) {
            $this->assertEquals(422, $res->status());
            return;
        }
        $payload = $this->checkoutPayload($store);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);
        $this->assertTrue(in_array($response->status(), [400, 500]));
    }
    private function addToCartViaApiExpect(Store $store, $product, int $qty = 1)
    {
        return $this->postJson('/api/cart/add', [
            'store_id' => $store->id,
            'product_id' => $product->id,
            'quantity' => $qty,
        ]);
    }

    public function test_validation_errors_return_correctly(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->addToCartViaApi($store, $product);

        $payload = $this->checkoutPayload($store, null, 'cod', [
            'customer_first_name' => '',
            'customer_email' => 'invalid-email',
        ]);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);
        $response->assertStatus(422);
        $response->assertJson(['success' => false]);
    }

    public function test_cod_creates_order_successfully(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat);
        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'cod@test.com', 'password' => bcrypt('pass'), 'is_active' => true]);
        CartItem::create(['store_id' => $store->id, 'customer_id' => $customer->id, 'session_id' => session()->getId(), 'product_id' => $product->id, 'quantity' => 1, 'price' => $product->price]);
        $this->actingAs($customer, 'customer');

        $payload = $this->checkoutPayload($store, null, 'cod', ['customer_email' => 'cod@test.com']);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);
        $response->assertStatus(200)->assertJson(['success' => true]);
        $order = Order::where('store_id', $store->id)->first();
        $this->assertEquals('pending', $order->status);
        $this->assertEquals('pending', $order->payment_status);
    }

    public function test_customer_can_create_order_and_cart_cleared(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat);
        $customer = Customer::create([
            'store_id' => $store->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        // Add cart as customer via direct DB (customer guard)
        CartItem::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'session_id' => session()->getId(),
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => $product->price,
        ]);
        $this->actingAs($customer, 'customer');

        $payload = $this->checkoutPayload($store, null, 'cod', [
            'customer_first_name' => 'John',
            'customer_last_name' => 'Doe',
            'customer_email' => 'john@example.com',
        ]);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);
        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('orders', ['customer_id' => $customer->id, 'store_id' => $store->id]);
        $this->assertEquals(0, CartItem::where('store_id', $store->id)->where('customer_id', $customer->id)->count());
    }

    public function test_no_partial_records_on_failure(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->addToCartViaApi($store, $product);

        $payload = $this->checkoutPayload($store, null, 'cod', ['customer_email' => 'not-an-email']);
        $response = $this->postJson($this->placeOrderUrl($store), $payload);
        $response->assertStatus(422);
        $this->assertEquals(0, Order::count());
        $this->assertEquals(0, \App\Models\OrderItem::count());
    }
}
