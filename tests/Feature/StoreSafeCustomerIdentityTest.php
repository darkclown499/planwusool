<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

/**
 * T2-A: Store-safe customer identity.
 *
 * The customer session cookie is shared across all {store}.{domain}
 * subdomains, but a customer only belongs to ONE store. Every storefront
 * surface must treat a customer as authenticated ONLY on their own store and
 * as a guest everywhere else — without destroying the original store session.
 */
class StoreSafeCustomerIdentityTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name' => 'P'.uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'TStore';
        $store->slug = $attrs['slug'] ?? 'tstore-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createCustomer(Store $store, string $email, string $password = 'oldpass123'): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'FirstA',
            'last_name' => 'LastA',
            'email' => $email,
            'email_verified_at' => now(),
            'password' => bcrypt($password),
            'phone' => '0599000000',
            'is_active' => true,
        ]);
    }

    private function domain(): string
    {
        return config('app.store_domain', 'localhost');
    }

    private function storeUrl(Store $store, string $path = '/'): string
    {
        return 'http://'.$store->slug.'.'.$this->domain().$path;
    }

    private function requestForStore(Store $store): Request
    {
        $req = Request::create($this->storeUrl($store), 'GET');
        $req->attributes->set('resolved_store', $store);
        $req->setLaravelSession(app('session.store'));
        $this->app->instance('request', $req);
        return $req;
    }

    private function commonProps(?Request $req = null): array
    {
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl, 'getCommonData');
        $m->setAccessible(true);
        return $m->invoke($ctrl);
    }

    private function inertiaSharedProps(Request $req): array
    {
        return (new \App\Http\Middleware\HandleInertiaRequests())->share($req);
    }

    private function orderData(Store $store, array $overrides = []): array
    {
        return array_merge([
            'store_id' => $store->id,
            'customer_email' => 'checkout@test.test',
            'customer_phone' => '0599000000',
            'customer_first_name' => 'Checkout',
            'customer_last_name' => 'User',
            'shipping_address' => 'Street 1',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'shipping_postal_code' => '0',
            'billing_address' => 'Street 1',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'billing_postal_code' => '0',
            'subtotal' => 10,
            'tax_amount' => 0,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 10,
            'payment_method' => 'cod',
            'currency' => 'USD',
            'order_source' => 'storefront',
        ], $overrides);
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Storefront common props: identity is store-scoped
    // ─────────────────────────────────────────────────────────────

    public function test_store_a_customer_is_guest_on_store_b_common_props(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $this->requestForStore($storeB);
        $props = $this->commonProps();

        $this->assertFalse($props['isLoggedIn']);
        $this->assertNull($props['customer']);
        $this->assertSame([], $props['customer_address']);
    }

    public function test_store_b_common_props_do_not_leak_store_a_customer_pii(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a-leak@test.test');
        $this->actingAs($customerA, 'customer');

        $this->requestForStore($storeB);
        $props = $this->commonProps();

        $this->assertStringNotContainsString('a-leak@test.test', json_encode($props));
        $this->assertStringNotContainsString('FirstA', json_encode($props));
        $this->assertArrayNotHasKey('date_of_birth', $props['customer'] ?? []);
    }

    public function test_store_a_customer_stays_logged_in_on_own_store_with_minimal_projection(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $this->requestForStore($storeA);
        $props = $this->commonProps();

        $this->assertTrue($props['isLoggedIn']);
        $this->assertNotNull($props['customer']);
        $this->assertSame((int) $customerA->id, (int) $props['customer']['id']);
        $this->assertSame('FirstA', $props['customer']['first_name']);
        $this->assertSame('a@test.test', $props['customer']['email']);
        // Minimal projection: internal PII columns must never reach the storefront.
        $this->assertArrayNotHasKey('date_of_birth', $props['customer']);
        $this->assertArrayNotHasKey('gender', $props['customer']);
        $this->assertArrayNotHasKey('notes', $props['customer']);
        $this->assertArrayNotHasKey('password', $props['customer']);
        $this->assertArrayNotHasKey('store_id', $props['customer']);
    }

    public function test_inertia_global_share_is_guest_on_foreign_store(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $req = $this->requestForStore($storeB);
        $props = $this->inertiaSharedProps($req);

        $this->assertIsCallable($props['isLoggedIn']);
        $this->assertIsCallable($props['customer']);
        $this->assertIsCallable($props['customer_address']);
        $this->assertFalse($props['isLoggedIn']());
        $this->assertNull($props['customer']());
        $this->assertSame([], $props['customer_address']());
    }

    public function test_effective_customer_helper_is_store_scoped(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $reqA = $this->requestForStore($storeA);
        $reqB = $this->requestForStore($storeB);

        $this->assertSame((int) $customerA->id, (int) storefrontCurrentCustomer($reqA)->id);
        $this->assertNull(storefrontCurrentCustomer($reqB));
        $this->assertNull(storefrontCurrentCustomer($reqB, (int) $storeB->id));
        $this->assertSame((int) $customerA->id, (int) storefrontCurrentCustomer($reqA, (int) $storeA->id)->id);
    }

    public function test_all_six_templates_receive_own_customer_identity(): void
    {
        $templates = ['fashion-atelier', 'bazaar-market', 'grocery-souq', 'bakery-house', 'electronics-hub', 'restaurant-menu'];
        foreach ($templates as $tpl) {
            [$u, $store] = $this->ownerWithStore(['theme' => $tpl, 'slug' => 'tpl-'.$tpl.'-'.uniqid()]);
            $customer = $this->createCustomer($store, 'c'.uniqid().'@test.test');
            $this->actingAs($customer, 'customer');

            $this->requestForStore($store);
            $props = $this->commonProps();

            $this->assertTrue($props['isLoggedIn'], "template $tpl should keep its own customer logged in");
            $this->assertSame((int) $customer->id, (int) $props['customer']['id'], "template $tpl customer id");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Profile mutations fail closed cross-store
    // ─────────────────────────────────────────────────────────────

    public function test_profile_update_denied_from_foreign_store(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $res = $this->postJson($this->storeUrl($storeB, '/profile/update'), [
            'first_name' => 'Hacked',
            'last_name' => 'LastA',
            'email' => 'a@test.test',
            'phone' => '0599000000',
        ]);

        $res->assertStatus(403);
        $this->assertSame('FirstA', $customerA->fresh()->first_name);
    }

    public function test_password_update_denied_from_foreign_store(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');
        $hashBefore = $customerA->password;

        $res = $this->postJson($this->storeUrl($storeB, '/profile/password'), [
            'current_password' => 'oldpass123',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ]);

        $res->assertStatus(403);
        $this->assertSame($hashBefore, $customerA->fresh()->password);
    }

    public function test_profile_update_allowed_on_own_store(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $res = $this->postJson($this->storeUrl($storeA, '/profile/update'), [
            'first_name' => 'NewName',
            'last_name' => 'LastA',
            'email' => 'a@test.test',
            'phone' => '0599000000',
        ]);

        $this->assertNotSame(403, $res->status());
        $this->assertSame('NewName', $customerA->fresh()->first_name);
    }

    public function test_password_update_allowed_on_own_store(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $res = $this->postJson($this->storeUrl($storeA, '/profile/password'), [
            'current_password' => 'oldpass123',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ]);

        $this->assertNotSame(403, $res->status());
        $this->assertTrue(password_verify('newpass123', $customerA->fresh()->password));
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Order binding: customer_id only for the order's store
    // ─────────────────────────────────────────────────────────────

    public function test_create_order_on_foreign_store_never_binds_foreign_customer(): void
    {
        Bus::fake();
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $order = app(OrderService::class)->createOrder($this->orderData($storeB), []);

        $this->assertSame((int) $storeB->id, (int) $order->store_id);
        $this->assertNull($order->customer_id);
    }

    public function test_create_order_on_own_store_still_binds_correct_customer(): void
    {
        Bus::fake();
        [$uA, $storeA] = $this->ownerWithStore();
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $order = app(OrderService::class)->createOrder($this->orderData($storeA), []);

        $this->assertSame((int) $customerA->id, (int) $order->customer_id);
        $this->assertSame((int) $storeA->id, (int) $order->store_id);
    }

    public function test_invariant_any_bound_order_customer_belongs_to_order_store(): void
    {
        Bus::fake();
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $customerB = $this->createCustomer($storeB, 'b@test.test');

        $this->actingAs($customerA, 'customer');
        app(OrderService::class)->createOrder($this->orderData($storeA), []);

        $this->actingAs($customerB, 'customer');
        app(OrderService::class)->createOrder($this->orderData($storeB), []);
        app(OrderService::class)->createOrder($this->orderData($storeA), []);

        $orders = Order::query()->get();
        $this->assertNotEmpty($orders);
        foreach ($orders as $o) {
            if ($o->customer_id === null) {
                continue;
            }
            $this->assertNotNull($o->customer, "order {$o->order_number} has orphan customer_id");
            $this->assertSame((int) $o->customer->store_id, (int) $o->store_id, "order {$o->order_number} mixes tenant customer");
        }
    }

    public function test_login_required_checkout_blocks_foreign_customer(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');

        StoreConfiguration::setConfiguration($storeB->id, 'customer_accounts_enabled', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'enable_customer_login', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'show_auth_button', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'require_login_checkout', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'store_status', 'true');

        $this->actingAs($customerA, 'customer');

        $res = $this->postJson($this->storeUrl($storeB, '/order/place'), [
            'store_id' => $storeB->id,
            'payment_method' => 'cod',
        ]);

        $res->assertStatus(401);
        $this->assertTrue((bool) $res->json('requires_login'));
    }

    public function test_guest_disabled_checkout_blocks_foreign_customer(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');

        StoreConfiguration::setConfiguration($storeB->id, 'customer_accounts_enabled', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'enable_customer_login', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'show_auth_button', 'true');
        StoreConfiguration::setConfiguration($storeB->id, 'guest_checkout', 'false');
        StoreConfiguration::setConfiguration($storeB->id, 'store_status', 'true');

        $this->actingAs($customerA, 'customer');

        $res = $this->postJson($this->storeUrl($storeB, '/order/place'), [
            'store_id' => $storeB->id,
            'payment_method' => 'cod',
        ]);

        $res->assertStatus(401);
    }

    public function test_checkout_on_foreign_store_ignores_customer_cart_and_never_orders(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');

        StoreConfiguration::setConfiguration($storeB->id, 'store_status', 'true');

        $cat = Category::factory()->create(['store_id' => $storeB->id, 'is_active' => true, 'slug' => 'cat-'.uniqid()]);
        $product = Product::create([
            'name' => 'P '.uniqid(),
            'price' => 100,
            'store_id' => $storeB->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'stock' => 10,
            'sku' => 'SKU-'.uniqid(),
        ]);
        // Grandfathered cart surface: a Store-A customer holds a customer-bound
        // cart on Store B. After the fix, Store B must IGNORE that cart entirely
        // (effective guest) — the pre-fix code reads it and binds the order to A.
        CartItem::create([
            'store_id' => $storeB->id,
            'customer_id' => $customerA->id,
            'session_id' => session()->getId(),
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => $product->price,
        ]);

        $this->actingAs($customerA, 'customer');

        $payload = [
            'store_id' => $storeB->id,
            'customer_first_name' => 'Checkout',
            'customer_last_name' => 'User',
            'customer_email' => 'checkout@test.test',
            'customer_phone' => '0599000000',
            'shipping_address' => 'Street 1',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'shipping_postal_code' => '0',
            'billing_address' => 'Street 1',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'billing_postal_code' => '0',
            'subtotal' => 100,
            'tax_amount' => 0,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 100,
            'payment_method' => 'cod',
        ];

        $res = $this->postJson($this->storeUrl($storeB, '/order/place'), $payload);

        // The foreign customer's identity must not drive the order: their cart is
        // invisible on B (guest → empty cart or login gate), so NO order may exist.
        $this->assertTrue(
            in_array($res->status(), [400, 401], true),
            'expected guest-block on foreign store, got '.$res->status().' | '.$res->getContent()
        );
        $this->assertSame(0, Order::where('store_id', $storeB->id)->count(), 'cross-store order must never be created');
        $this->assertNull(Order::where('customer_id', $customerA->id)->where('store_id', $storeB->id)->first());
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Loyalty: never merge foreign customer with foreign store
    // ─────────────────────────────────────────────────────────────

    public function test_loyalty_balance_denied_for_foreign_customer(): void
    {
        [$uA, $storeA] = $this->ownerWithStore();
        [$uB, $storeB] = $this->ownerWithStore(['slug' => 'b-'.uniqid()]);
        $customerA = $this->createCustomer($storeA, 'a@test.test');
        $this->actingAs($customerA, 'customer');

        $res = $this->getJson($this->storeUrl($storeB, '/api/loyalty/balance').'?store_id='.$storeB->id);

        $res->assertStatus(403);
    }
}