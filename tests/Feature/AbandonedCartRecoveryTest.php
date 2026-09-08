<?php

namespace Tests\Feature;

use App\Mail\AbandonedCartReminderMail;
use App\Models\AbandonedCart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\AbandonedCartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * T4-A — abandoned cart recovery delivery + tenant-safe recovery.
 *
 * Certifies:
 *  - recovery URL is the store's own domain root (never APP_URL / fake checkout)
 *  - reminder e-mail CTA renders the store recovery URL
 *  - POST /api/cart/recover is tenant-authoritative (never client store/session/customer ids)
 *  - current price / inventory / variant truth win over the snapshot
 *  - invalid/expired/recovered/foreign token states all fail closed with ONE generic shape
 *  - store-A customer on store-B host restores as a guest
 *  - repeat recovery is idempotent (single CartItem row, merged quantity)
 *  - draft response no longer exposes the raw recovery token
 *  - markRecovered is store-scoped and requires a matching order in the same store
 */
class AbandonedCartRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function companyUser(): User
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 10,
        ]);
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function storeFor(User $user): Store
    {
        $s = new Store();
        $s->user_id = $user->id;
        $s->name = 'Store ' . uniqid();
        $s->slug = 's-' . uniqid();
        $s->theme = 'bazaar-market';
        $s->email = 's@' . uniqid() . '.com';
        $s->save();
        $user->current_store = $s->id;
        $user->save();
        return $s;
    }

    private function product(Store $store, array $over = []): Product
    {
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 10,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $over));
    }

    private function customerFor(Store $store): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Shopper',
            'last_name' => 'Test',
            'email' => 'shopper-' . uniqid() . '@example.com',
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);
    }

    private function makeCart(Store $store, array $overrides = []): AbandonedCart
    {
        return AbandonedCart::forceCreate(array_merge([
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'customer_name' => 'Recovery Shopper',
            'customer_email' => 'recover@example.com',
            'cart_items' => [['name' => 'Test Product', 'quantity' => 1, 'price' => 100]],
            'cart_total' => 100,
            'status' => 'abandoned',
            'last_activity_at' => now(),
            'reminder_count' => 0,
            'recovery_token' => bin2hex(random_bytes(32)),
            'expires_at' => now()->addDays(7),
        ], $overrides));
    }

    private function orderFor(Store $store, string $sessionId): Order
    {
        $order = new Order();
        $order->store_id = $store->id;
        $order->order_number = Order::generateOrderNumber();
        $order->session_id = $sessionId;
        $order->status = 'confirmed';
        $order->payment_status = 'paid';
        $order->customer_email = 'buyer@example.com';
        $order->customer_first_name = 'Buyer';
        $order->customer_last_name = 'Test';
        $order->shipping_address = 'Street 1';
        $order->shipping_city = 'City';
        $order->shipping_state = 'State';
        $order->shipping_country = 'PS';
        $order->billing_address = 'Street 1';
        $order->billing_city = 'City';
        $order->billing_state = 'State';
        $order->billing_country = 'PS';
        $order->subtotal = 100;
        $order->total_amount = 100;
        $order->payment_method = 'cash_on_delivery';
        $order->save();
        return $order;
    }

    private function storeHost(Store $store): string
    {
        return $store->slug . '.localhost';
    }

    private function recoverOn(Store $store, string $token, array $extra = []): \Illuminate\Testing\TestResponse
    {
        $host = $this->storeHost($store);
        return $this->withServerVariables(['HTTP_HOST' => $host])
            ->postJson('http://' . $host . '/api/cart/recover', array_merge(['recover_token' => $token], $extra));
    }

    public function test_recovery_url_uses_store_domain_root_never_app_url_or_checkout(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $cart = $this->makeCart($store);

        $url = $cart->getRecoverUrl();

        $this->assertStringStartsWith('http://', $url);
        $this->assertStringContainsString($store->slug . '.localhost', $url, 'store subdomain host expected');
        $this->assertStringNotContainsString(config('app.url'), $url, 'APP_URL must never be the recovery destination');
        $this->assertStringNotContainsString('/checkout', $url);
        $this->assertStringContainsString('recover_token=' . $cart->recovery_token, $url);
        $this->assertSame($this->storeHost($store), parse_url($url, PHP_URL_HOST), 'must land on the store root host');
        $this->assertSame('/', parse_url($url, PHP_URL_PATH));
    }

    public function test_mail_cta_renders_store_recovery_url(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $cart = $this->makeCart($store);

        $mail = new AbandonedCartReminderMail($cart);
        $with = $mail->content()->with;
        $rendered = view('emails.abandoned-cart-reminder', $with)->render();

        $this->assertArrayHasKey('recoverUrl', $with);
        $this->assertStringContainsString($cart->getRecoverUrl(), $rendered, 'email CTA must point at the store recovery URL');
        $this->assertStringNotContainsString('/checkout', $rendered);
    }

    public function test_recovery_restores_guest_cart_with_current_price_and_inventory(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        // Stale snapshot price 150 vs CURRENT price 100 — current must win.
        $p = $this->product($store, ['price' => 100]);
        $cart = $this->makeCart($store, [
            'cart_items' => [['name' => $p->name, 'product_id' => $p->id, 'quantity' => 2, 'price' => 150]],
        ]);

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertOk();
        $this->assertSame(1, $res->json('restored'));
        $this->assertSame(0, $res->json('skipped'));

        $this->assertSame(1, CartItem::where('store_id', $store->id)->count());
        $item = CartItem::where('store_id', $store->id)->first();
        $this->assertSame((int) $p->id, (int) $item->product_id);
        $this->assertSame(2, (int) $item->quantity);
        $this->assertSame(100.0, (float) $item->price, 'current price must win over the snapshot');
        $this->assertNull($item->customer_id, 'guest recovery must stay guest');
        $this->assertNotNull($item->session_id);
    }

    public function test_recovery_repeat_is_idempotent_merges_single_row(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $customer = $this->customerFor($store);
        $p = $this->product($store, ['price' => 100]);
        $cart = $this->makeCart($store, [
            'session_id' => 'sess-idem',
            'cart_items' => [['name' => $p->name, 'product_id' => $p->id, 'quantity' => 2, 'price' => 150]],
        ]);

        $this->actingAs($customer, 'customer');

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertOk();
        $this->assertSame(1, $res->json('restored'));

        $res2 = $this->recoverOn($store, $cart->recovery_token);
        $res2->assertOk();
        $this->assertSame(1, $res2->json('restored'));

        // One row, merged quantity (2 + 2), no duplicate CartItems.
        $rows = CartItem::where('store_id', $store->id)->where('product_id', $p->id)->get();
        $this->assertCount(1, $rows);
        $this->assertSame(4, (int) $rows->first()->quantity);
    }

    public function test_recovery_invalid_token_fails_closed_with_generic_shape(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);

        $res = $this->recoverOn($store, bin2hex(random_bytes(32)));
        $res->assertNotFound();
        $this->assertSame('Link is invalid or expired.', $res->json('message'));
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count());
    }

    public function test_recovery_expired_token_fails_closed(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $cart = $this->makeCart($store, ['expires_at' => now()->subDay()]);

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertNotFound();
        $this->assertSame('Link is invalid or expired.', $res->json('message'));
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count());
    }

    public function test_recovery_recovered_cart_token_fails_closed(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $session = 'sess-recovered';
        $order = $this->orderFor($store, $session);
        $cart = $this->makeCart($store, [
            'session_id' => $session,
            'status' => 'recovered',
            'recovered_at' => now(),
            'recovered_order_id' => $order->id,
        ]);

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertNotFound();
        $this->assertSame('Link is invalid or expired.', $res->json('message'));
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count());
    }

    public function test_recovery_cross_store_token_fails_closed(): void
    {
        [, $storeA] = $this->storePair();
        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $cartB = $this->makeCart($storeB);

        // Cart belongs to store B; token is looked up under store A -> terminal state.
        $res = $this->recoverOn($storeA, $cartB->recovery_token);
        $res->assertNotFound();
        $this->assertSame('Link is invalid or expired.', $res->json('message'));
        $this->assertSame(0, CartItem::where('store_id', $storeA->id)->count());
    }

    public function test_recovery_without_tenant_authority_fails_closed_and_ignores_client_ids(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $cart = $this->makeCart($store);

        // No domain resolution, no customer, no session context -> 403. Client
        // ids are provided and must be completely ignored as authority.
        $res = $this->postJson('/api/cart/recover', [
            'recover_token' => $cart->recovery_token,
            'store_id' => $store->id,
            'session_id' => 'evil-session',
            'customer_id' => 999,
        ]);

        $res->assertStatus(403);
        $this->assertSame('Link is invalid or expired.', $res->json('message'));
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count());
    }

    public function test_recovery_store_a_customer_on_store_b_restores_as_guest(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $customerA = $this->customerFor($storeA);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $pB = $this->product($storeB, ['price' => 60]);
        $cartB = $this->makeCart($storeB, [
            'cart_items' => [['name' => $pB->name, 'product_id' => $pB->id, 'quantity' => 1, 'price' => 60]],
        ]);

        $this->actingAs($customerA, 'customer');

        $res = $this->recoverOn($storeB, $cartB->recovery_token);
        $res->assertOk();
        $this->assertSame(1, $res->json('restored'));

        // Store-A customer on store-B must restore as a GUEST cart owner.
        $item = CartItem::where('store_id', $storeB->id)->where('product_id', $pB->id)->first();
        $this->assertNotNull($item);
        $this->assertNull($item->customer_id, 'foreign-store customer must never own the cart');
        $this->assertNotNull($item->session_id);
    }

    public function test_recovery_skips_deleted_disabled_products_and_reports_counts(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $good = $this->product($store, ['price' => 30]);
        $disabled = $this->product($store, ['price' => 20, 'is_active' => false]);
        $deleted = $this->product($store, ['price' => 10]);
        $deletedId = $deleted->id;
        $deleted->delete();

        $cart = $this->makeCart($store, [
            'cart_items' => [
                ['name' => $good->name, 'product_id' => $good->id, 'quantity' => 1, 'price' => 30],
                ['name' => $disabled->name, 'product_id' => $disabled->id, 'quantity' => 1, 'price' => 20],
                ['name' => $deleted->name, 'product_id' => $deletedId, 'quantity' => 1, 'price' => 10],
            ],
        ]);

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertOk();
        $this->assertSame(1, $res->json('restored'), 'only the active product restores');
        $this->assertSame(2, $res->json('skipped'), 'deleted/disabled products truthfully skipped');

        $this->assertSame(1, CartItem::where('store_id', $store->id)->count());
        $this->assertDatabaseMissing('cart_items', ['store_id' => $store->id, 'product_id' => $disabled->id]);
        $this->assertDatabaseMissing('cart_items', ['store_id' => $store->id, 'product_id' => $deletedId]);
    }

    public function test_recovery_invalid_variant_is_skipped_without_malformed_row(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $p = $this->variantProduct($store);
        $cart = $this->makeCart($store, [
            'cart_items' => [
                ['name' => $p->name, 'product_id' => $p->id, 'quantity' => 1, 'price' => 120, 'options' => ['Color' => 'Fake', 'Size' => 'M']],
            ],
        ]);

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertOk();
        $this->assertSame(0, $res->json('restored'));
        $this->assertSame(1, $res->json('skipped'));
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count(), 'no malformed selection may be persisted');
    }

    public function test_recovery_out_of_stock_is_skipped_and_caps_quantity_to_available(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        // Variant combo Black‖L has stock 2; snapshot asks for 10 -> capped to 2.
        $variant = $this->variantProduct($store);
        // Simple product with zero stock -> skipped entirely.
        $soldOut = $this->product($store, ['price' => 25, 'stock' => 0]);

        $cart = $this->makeCart($store, [
            'cart_items' => [
                ['name' => $variant->name, 'product_id' => $variant->id, 'quantity' => 10, 'price' => 130, 'options' => ['Color' => 'Black', 'Size' => 'L']],
                ['name' => $soldOut->name, 'product_id' => $soldOut->id, 'quantity' => 1, 'price' => 25],
            ],
        ]);

        $res = $this->recoverOn($store, $cart->recovery_token);
        $res->assertOk();
        $this->assertSame(1, $res->json('restored'));
        $this->assertSame(1, $res->json('skipped'));

        $item = CartItem::where('store_id', $store->id)->where('product_id', $variant->id)->first();
        $this->assertNotNull($item);
        $this->assertSame(2, (int) $item->quantity, 'quantity must be capped to the CURRENT available stock');
        $this->assertEquals(['Color' => 'Black', 'Size' => 'L'], $item->variants);
        $this->assertSame('Black‖L', \App\Services\InventoryService::resolve($variant, ['Color' => 'Black', 'Size' => 'L'])['combination']['id']);
        $this->assertSame(130.0, (float) $item->price, 'variant price must win');
        $this->assertDatabaseMissing('cart_items', ['store_id' => $store->id, 'product_id' => $soldOut->id]);
    }

    public function test_mark_recovered_is_store_scoped_and_requires_matching_order(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);

        $session = 'shared-session-between-stores';
        $cartA = $this->makeCart($storeA, ['session_id' => $session, 'status' => 'abandoned']);
        $cartB = $this->makeCart($storeB, ['session_id' => $session, 'status' => 'abandoned']);

        $orderA = $this->orderFor($storeA, $session);
        $orderB = $this->orderFor($storeB, $session);

        $service = app(AbandonedCartService::class);

        // A store-A order recovers only store-A carts sharing the session.
        $service->markRecovered($storeA->id, $session, $orderA->id);
        $cartA->refresh();
        $cartB->refresh();
        $this->assertEquals('recovered', $cartA->status);
        $this->assertEquals($orderA->id, $cartA->recovered_order_id);
        $this->assertEquals('abandoned', $cartB->status, 'same session id is never sufficient across stores');
        $this->assertNull($cartB->recovered_order_id);

        // A store-B order cannot re-link store-A carts even with the same session.
        $cartA->update(['status' => 'abandoned', 'recovered_at' => null, 'recovered_order_id' => null]);
        $cartA->refresh();
        $service->markRecovered($storeA->id, $session, $orderB->id);
        $cartA->refresh();
        $this->assertEquals('abandoned', $cartA->status, 'foreign-store order must never recover the cart');
    }

    public function test_draft_response_does_not_expose_raw_token(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);

        $host = $this->storeHost($store);
        $res = $this->withServerVariables(['HTTP_HOST' => $host])
            ->postJson('http://' . $host . '/api/cart/draft', [
                'store_id' => $store->id,
                'items' => [['name' => 'Prod', 'quantity' => 1, 'price' => 50]],
            ]);

        $res->assertOk();
        $json = $res->json();
        $this->assertArrayNotHasKey('recovery_token', $json, 'raw credential must not be returned');
        $this->assertStringStartsWith('http://' . $host, $json['recover_url']);
        $this->assertStringContainsString('recover_token=', $json['recover_url']);
    }

    private function variantProduct(Store $store): Product
    {
        return $this->product($store, [
            'inventory_mode' => 'variant',
            'variants' => [
                ['name' => 'Color', 'values' => ['Black', 'White']],
                ['name' => 'Size', 'values' => ['M', 'L']],
            ],
            'variant_combinations' => [
                ['id' => 'Black‖M', 'values' => ['Black', 'M'], 'label' => 'Black / M', 'price' => '120', 'stock' => '5', 'sku' => 'BLK-M', 'image' => ''],
                ['id' => 'Black‖L', 'values' => ['Black', 'L'], 'label' => 'Black / L', 'price' => '130', 'stock' => '2', 'sku' => 'BLK-L', 'image' => ''],
            ],
        ]);
    }

    private function storePair(): array
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        return [$user, $store];
    }
}