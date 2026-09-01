<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Phase 1 — Palestine Payments OS: safe foundation.
 *
 * Guards the canonical server-side rules that the payment hub relies on:
 *  - only enabled/configured methods may create an order (Phase 10)
 *  - an explicitly disabled COD is rejected server-side (was hardcoded always-on)
 *  - COD/manual bank transfer orders stay pending (never auto-paid)
 *  - legacy aliases (cash / cash_on_delivery) obey the same COD rule
 *  - checkout payment list reflects store config, not frontend injection
 *  - store A cannot use store B's payment configuration
 */
class PalestinePaymentsPhase1Test extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $storeAttrs = []): array
    {
        $plan = Plan::factory()->create([
            'name' => 'P'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
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
        $store->name = $storeAttrs['name'] ?? 'S'.uniqid();
        $store->slug = $storeAttrs['slug'] ?? 's-'.uniqid();
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
            'name' => 'Test Product '.uniqid(),
            'price' => 100,
            'store_id' => $store->id,
            'category_id' => $category->id,
            'is_active' => true,
            'stock' => $stock,
            'sku' => 'SKU-'.uniqid(),
        ]);
    }

    /** Add item directly to the session cart so placeOrder totals resolve. */
    private function seedCart(Store $store, Product $product, int $qty = 1): void
    {
        $customer = Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Guest',
            'last_name' => 'User',
            'email' => 'guest-'.uniqid().'@example.com',
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
    }

    private function checkoutPayload(Store $store, string $paymentMethod = 'cod', array $overrides = []): array
    {
        return array_merge([
            'store_id' => $store->id,
            'customer_first_name' => 'Test',
            'customer_last_name' => 'User',
            'customer_email' => 'phase1-'.uniqid().'@example.com',
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
            'shipping_method_id' => null,
            'notes' => '',
            'idempotency_key' => 'p1-'.uniqid(),
        ], $overrides);
    }

    private function placeOrderUrl(Store $store): string
    {
        return route('store.order.place', ['storeSlug' => $store->slug]);
    }

    private function postBankOrder(Store $store): \Illuminate\Testing\TestResponse
    {
        $payload = $this->checkoutPayload($store, 'bank');
        $payload['bank_transfer_receipt'] = UploadedFile::fake()->image('receipt.jpg', 100, 100);

        return $this->post($this->placeOrderUrl($store), $payload, ['Accept' => 'application/json']);
    }

    // -----------------------------------------------------------------
    // COD: explicit disable is respected server-side
    // -----------------------------------------------------------------

    public function test_disabled_cod_rejected_server_side(): void
    {
        [$user, $store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '0', $store->id);

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postJson($this->placeOrderUrl($store), $this->checkoutPayload($store, 'cod'));

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_legacy_cod_aliases_respect_disable(): void
    {
        [$user, $store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '0', $store->id);

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        foreach (['cash', 'cash_on_delivery', 'cash-on-delivery'] as $alias) {
            $response = $this->postJson($this->placeOrderUrl($store), $this->checkoutPayload($store, $alias));
            $response->assertStatus(422, 'legacy alias '.$alias.' must respect disabled COD');
        }

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_enabled_cod_order_stays_pending(): void
    {
        [$user, $store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '1', $store->id);

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postJson($this->placeOrderUrl($store), $this->checkoutPayload($store, 'cod'));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = Order::where('store_id', $store->id)->first();
        $this->assertNotNull($order);
        $this->assertEquals('cod', $order->payment_method);
        $this->assertEquals('pending', $order->payment_status, 'COD order must never be auto-paid');
        $this->assertEquals('pending', $order->status, 'COD order status stays pending until merchant confirmation');
    }

    public function test_cod_default_on_when_never_configured(): void
    {
        // Preserve historical default: stores that never configured COD keep it available.
        [$user, $store] = $this->ownerWithStore();

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postJson($this->placeOrderUrl($store), $this->checkoutPayload($store, 'cod'));
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = Order::where('store_id', $store->id)->first();
        $this->assertNotNull($order);
        $this->assertEquals('pending', $order->payment_status);
    }

    // -----------------------------------------------------------------
    // Manual bank transfer: remains pending, enabled only per-store
    // -----------------------------------------------------------------

    public function test_bank_transfer_enabled_remains_pending(): void
    {
        [$user, $store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_bank_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'bank_detail', 'بنك فلسطين — حساب 123456 — IBAN PS000', $store->id);

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postBankOrder($store);
        $response->assertStatus(200)->assertJson(['success' => true]);

        $order = Order::where('store_id', $store->id)->first();
        $this->assertNotNull($order);
        $this->assertEquals('bank', $order->payment_method);
        $this->assertEquals('pending', $order->payment_status, 'bank transfer must remain pending until merchant verifies proof');
    }

    public function test_disabled_bank_transfer_rejected_server_side(): void
    {
        [$user, $store] = $this->ownerWithStore();

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postBankOrder($store);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    // -----------------------------------------------------------------
    // Non-COD disabled provider rejected server-side
    // -----------------------------------------------------------------

    public function test_disabled_gateway_rejected_server_side(): void
    {
        [$user, $store] = $this->ownerWithStore();

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postJson($this->placeOrderUrl($store), $this->checkoutPayload($store, 'stripe'));

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_invalid_provider_rejected(): void
    {
        [$user, $store] = $this->ownerWithStore();

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = $this->createProduct($store, $cat);
        $this->seedCart($store, $product);

        $response = $this->postJson($this->placeOrderUrl($store), $this->checkoutPayload($store, 'not_a_real_provider'));

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    // -----------------------------------------------------------------
    // Storefront checkout list mirrors store configuration
    // -----------------------------------------------------------------

    public function test_checkout_api_excludes_disabled_cod(): void
    {
        [$user, $store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '0', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'is_jawwal_pay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'jawwal_pay_phone_number', '0599000111', $store->id);

        $response = $this->getJson("/api/payment-methods?store_id={$store->id}");
        $response->assertOk();

        $names = array_column($response->json('payment_methods') ?? [], 'name');
        $this->assertNotContains('cod', $names, 'disabled COD must not be exposed to checkout');
        $this->assertNotContains('cash', $names);
        $this->assertContains('jawwal_pay', $names);
    }

    public function test_checkout_api_includes_enabled_bank_with_details(): void
    {
        [$user, $store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_bank_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'bank_detail', 'بنك فلسطين — حساب 123456 — IBAN PS000', $store->id);

        $response = $this->getJson("/api/payment-methods?store_id={$store->id}");
        $response->assertOk();

        $methods = $response->json('payment_methods') ?? [];
        $bank = collect($methods)->firstWhere('name', 'bank');
        $this->assertNotNull($bank, 'enabled bank transfer must be exposed to checkout');
        $this->assertStringContainsString('بنك فلسطين', $bank['details'] ?? '', 'only configured bank details must reach the customer');
    }

    // -----------------------------------------------------------------
    // Tenant isolation at order time
    // -----------------------------------------------------------------

    public function test_store_a_cannot_use_store_b_payment_config(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();

        // Only store A enables bank transfer.
        PaymentSetting::updateOrCreateSetting($userA->id, 'is_bank_enabled', '1', $storeA->id);
        PaymentSetting::updateOrCreateSetting($userA->id, 'bank_detail', 'A bank', $storeA->id);

        $catB = Category::factory()->create(['store_id' => $storeB->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $productB = $this->createProduct($storeB, $catB);
        $this->seedCart($storeB, $productB);

        // Attacker tries to place a bank-transfer order on store B (which never enabled it).
        $response = $this->postJson($this->placeOrderUrl($storeB), $this->checkoutPayload($storeB, 'bank'));

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }
}
