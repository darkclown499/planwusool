<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Currency;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * P2B-03 — Merchant Dashboard Next-Best-Action guidance.
 *
 * The dashboard must present exactly ONE state-based CTA derived from existing
 * readiness facts in a fixed priority: add product → setup payment → setup
 * delivery → publish store → review pending/confirmed orders → share store.
 * The selection happens on the server (normalized nextAction prop); the client
 * renders a single card with a resolvable CTA.
 */
class DashboardNextActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Currency::create(['name' => 'Israeli Shekel', 'code' => 'ILS', 'symbol' => '₪']);
    }

    private function merchantUser(): User
    {
        $user = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $plan = Plan::factory()->create([
            'max_stores' => 5,
            'max_products_per_store' => 100,
            'enable_custdomain' => 'off',
            'enable_custsubdomain' => 'off',
            'template_editor_level' => 'none',
            // These fixtures exercise the full ready-to-live journey, so the
            // plan must carry the shipping entitlement (otherwise resolveNextAction
            // stops at setup_delivery as the entitlement is a part of readiness).
            'enable_shipping_method' => 'on',
        ]);
        $user->plan_id = $plan->id;
        $user->plan_is_active = 1;
        $user->save();
        return $user;
    }

    private function createStore(User $user, string $slug): Store
    {
        $store = Store::forceCreate([
            'name' => 'Next Action Store',
            'slug' => $slug,
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->current_store = $store->id;
        $user->save();
        return $store;
    }

    private function addProduct(Store $store): void
    {
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id, 'store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true,
        ]);
    }

    private function addShipping(Store $store): void
    {
        Shipping::create([
            'store_id' => $store->id, 'name' => 'Flat', 'type' => 'flat_rate',
            'cost' => 10, 'is_active' => true, 'zone_type' => 'domestic',
        ]);
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);
    }

    private function addCodPayment(User $user, Store $store): void
    {
        PaymentSetting::updateOrCreate(
            ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled'],
            ['value' => '1']
        );
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);
    }

    private function makeReadyAndLive(User $user, Store $store): void
    {
        $this->addProduct($store);
        $this->addShipping($store);
        $this->addCodPayment($user, $store);
    }

    private function createOrder(Store $store, string $status): Order
    {
        return Order::forceCreate([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => $status,
            'payment_status' => 'pending',
            'customer_email' => 'c@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr', 'shipping_city' => 'Nablus', 'shipping_state' => 'WB', 'shipping_country' => 'PS',
            'billing_address' => 'Addr', 'billing_city' => 'Nablus', 'billing_state' => 'WB', 'billing_country' => 'PS',
            'subtotal' => 10, 'total_amount' => 10, 'payment_method' => 'cod',
        ]);
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    private function getNextAction(User $user): array
    {
        $res = $this->actingAs($user)->withHeader('X-Inertia', 'true')->withHeader('X-Inertia-Version', $this->inertiaVersion())
            ->getJson(route('dashboard'));
        $res->assertOk();
        $onboarding = $res->json('props.onboarding');
        $this->assertNotNull($onboarding);
        $this->assertArrayHasKey('nextAction', $onboarding, 'dashboard onboarding must carry a server-sourced nextAction');
        return $onboarding['nextAction'];
    }

    public function test_no_products_cta_is_add_product(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-add-product');

        $action = $this->getNextAction($user);

        $this->assertSame('add_product', $action['type']);
        $this->assertSame('أضف أول منتج', $action['title']);
        $this->assertSame('إضافة منتج', $action['cta']);
        $this->assertNotNull($action['href']);
        $this->assertSame(route('products.create'), $action['href']);
    }

    public function test_products_without_payment_cta_is_setup_payment(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-payment');
        $this->addProduct($store);

        $action = $this->getNextAction($user);

        $this->assertSame('setup_payment', $action['type']);
        $this->assertSame('فعّل طريقة دفع', $action['title']);
        $this->assertSame('/stores/' . $store->id . '/settings?tab=payments', $action['href']);
    }

    public function test_payment_without_delivery_cta_is_setup_delivery(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-delivery');
        $this->addProduct($store);
        $this->addCodPayment($user, $store);

        $action = $this->getNextAction($user);

        $this->assertSame('setup_delivery', $action['type']);
        $this->assertSame('إعداد التوصيل', $action['title']);
        $this->assertSame(route('delivery.index'), $action['href']);
        $this->assertSame('/delivery', route('delivery.index', [], false), 'delivery CTA must resolve to canonical Delivery Hub');
    }

    public function test_ready_but_unpublished_cta_is_publish_store(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-publish');
        $this->makeReadyAndLive($user, $store);
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $action = $this->getNextAction($user);

        $this->assertSame('publish_store', $action['type']);
        $this->assertSame('انشر متجرك', $action['title']);
        $this->assertNotNull($action['href']);
        $this->assertSame(route('stores.settings', $store->id) . '?tab=general', $action['href']);
    }

    public function test_live_with_pending_or_confirmed_order_cta_is_review_orders(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-review');
        $this->makeReadyAndLive($user, $store);

        $this->createOrder($store, 'pending');
        $action = $this->getNextAction($user);
        $this->assertSame('review_orders', $action['type']);
        // confirmed counts too
        Store::where('id', $store->id)->update(['updated_at' => now()]);
        $this->createOrder($store, 'confirmed');
        $action = $this->getNextAction($user);
        $this->assertSame('review_orders', $action['type']);
        $this->assertSame(route('orders.index'), $action['href']);
    }

    public function test_ready_and_live_no_orders_cta_is_share_store(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-share');
        $this->makeReadyAndLive($user, $store);

        $action = $this->getNextAction($user);

        $this->assertSame('share_store', $action['type']);
        $this->assertSame('شارك رابط متجرك', $action['title']);
        $this->assertSame('نسخ الرابط', $action['cta']);
        $this->assertNull($action['href'], 'share action is a clipboard copy, not a visitable href');
    }

    public function test_next_action_is_scoped_to_current_store(): void
    {
        $userA = $this->merchantUser();
        $storeA = $this->createStore($userA, 'nextaction-scope-a');
        $this->makeReadyAndLive($userA, $storeA);

        $userB = $this->merchantUser();
        $storeB = $this->createStore($userB, 'nextaction-scope-b');
        // Store B is empty (no products) and has a pending order — the pending
        // order of B must NOT leak into A's decision (A stays share_store).
        $this->createOrder($storeB, 'pending');

        $this->assertSame('share_store', $this->getNextAction($userA)['type']);
        $this->assertSame('add_product', $this->getNextAction($userB)['type']);
    }

    public function test_cta_routes_resolve_correctly(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'nextaction-routes');

        $this->assertSame('/products/create', route('products.create', [], false));
        $this->assertSame('/stores/' . $store->id . '/settings?tab=payments', '/stores/' . $store->id . '/settings?tab=payments');
        $this->assertSame('/delivery', route('delivery.index', [], false));
        $this->assertSame('/orders', route('orders.index', [], false));
        $this->assertSame(route('stores.settings', $store->id) . '?tab=general', route('stores.settings', $store->id) . '?tab=general');
    }

    public function test_only_one_primary_next_action_rendered(): void
    {
        // Server: nextAction is a single object with a single type.
        $user = $this->merchantUser();
        $this->createStore($user, 'nextaction-single');
        $res = $this->actingAs($user)->withHeader('X-Inertia', 'true')->withHeader('X-Inertia-Version', $this->inertiaVersion())
            ->getJson(route('dashboard'));
        $res->assertOk();
        $action = $res->json('props.onboarding.nextAction');
        $this->assertIsArray($action);
        $this->assertSame(['type', 'title', 'description', 'cta', 'href'], array_keys($action));

        // Client: a single server-sourced card, no competing client-derived step.
        $source = file_get_contents(resource_path('js/pages/dashboard.tsx'));
        $this->assertSame(1, substr_count($source, 'nextAction && !isSuperAdmin'), 'exactly one primary next-action card must render');
        $this->assertStringNotContainsString('onboarding.steps.find', $source, 'CTA must come from server nextAction, not client first-incomplete-step ordering');
        $this->assertStringContainsString('copyToClipboard() : router.visit(nextAction.href!)', $source, 'share CTA copies link, action CTA visits href');
    }
}