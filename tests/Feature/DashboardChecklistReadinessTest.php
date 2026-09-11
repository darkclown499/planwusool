<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Currency;
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
 * Merchant store-setup checklist readiness contract.
 *
 * The dashboard readiness snapshot must derive every flag from real persisted
 * state scoped to the current store.  No frontend-local toggles, no fabricated
 * completion, no cross-tenant leakage.
 */
class DashboardChecklistReadinessTest extends TestCase
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
            'name' => 'Checklist Store',
            'slug' => $slug,
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->current_store = $store->id;
        $user->save();
        return $store;
    }

    private function getReadiness(User $user): array
    {
        $res = $this->actingAs($user)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('dashboard'));
        $res->assertOk();
        $readiness = $res->json('props.onboarding.readiness');
        $this->assertNotNull($readiness, 'dashboard must provide readiness snapshot');
        return $readiness;
    }

    // ── 1. Brand-new store = expected initial state ──────────────────────

    public function test_brand_new_store_starts_at_zero_or_initial_state(): void
    {
        $user = $this->merchantUser();
        $this->createStore($user, 'checklist-empty');

        $readiness = $this->getReadiness($user);

        $this->assertArrayHasKey('items', $readiness);
        $this->assertArrayHasKey('basics', $readiness['items']);
        $this->assertArrayHasKey('design', $readiness['items']);
        $this->assertArrayHasKey('products', $readiness['items']);
        $this->assertArrayHasKey('payment', $readiness['items']);
        $this->assertArrayHasKey('delivery', $readiness['items']);
        $this->assertArrayHasKey('published', $readiness['items']);

        // Basics are complete (store has name + slug from createStore)
        $this->assertTrue($readiness['items']['basics']);
        // Design is complete (DEFAULT_TEMPLATE assigned)
        $this->assertTrue($readiness['items']['design']);
        // Products/payment/delivery not set up yet
        $this->assertFalse($readiness['items']['products']);
        $this->assertFalse($readiness['items']['payment']);
        $this->assertFalse($readiness['items']['delivery']);
        // Published defaults to true (no store_status key = published)
        $this->assertTrue($readiness['items']['published']);
        $this->assertFalse($readiness['readyToSell']);
        $this->assertArrayHasKey('percentage', $readiness);
        $this->assertIsInt($readiness['percentage']);
    }

    // ── 2. Product item becomes complete with current-store product ──────

    public function test_product_readiness_reflects_active_store_products(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-product');

        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id, 'store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Test Product', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true,
        ]);

        $readiness = $this->getReadiness($user);
        $this->assertTrue($readiness['items']['products']);
    }

    // ── 3. Foreign-store product does not count ──────────────────────────

    public function test_foreign_store_product_does_not_count(): void
    {
        $userA = $this->merchantUser();
        $storeA = $this->createStore($userA, 'checklist-scope-a');

        $userB = $this->merchantUser();
        $storeB = $this->createStore($userB, 'checklist-scope-b');

        $catB = Category::create(['name' => 'CatB', 'slug' => 'catb-' . $storeB->id, 'store_id' => $storeB->id, 'is_active' => true]);
        Product::create([
            'name' => 'Product B', 'price' => 20, 'stock' => 3, 'images' => '/tmp/b.jpg',
            'category_id' => $catB->id, 'store_id' => $storeB->id, 'is_active' => true,
        ]);

        $readinessA = $this->getReadiness($userA);
        $this->assertFalse($readinessA['items']['products'], 'Store A must not see Store B products');
    }

    // ── 4. Delivery item requires usable delivery method ─────────────────

    public function test_delivery_readiness_requires_active_shipping(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-delivery');

        $this->assertFalse($this->getReadiness($user)['items']['delivery']);

        Shipping::create([
            'store_id' => $store->id, 'name' => 'Flat', 'type' => 'flat_rate',
            'cost' => 10, 'is_active' => true, 'zone_type' => 'domestic',
        ]);
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $this->assertTrue($this->getReadiness($user)['items']['delivery']);
    }

    public function test_inactive_shipping_method_does_not_count(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-inactive-ship');

        Shipping::create([
            'store_id' => $store->id, 'name' => 'Inactive', 'type' => 'flat_rate',
            'cost' => 10, 'is_active' => false, 'zone_type' => 'domestic',
        ]);

        $this->assertFalse($this->getReadiness($user)['items']['delivery']);
    }

    // ── 5. Payment item requires usable configuration ────────────────────

    public function test_payment_readiness_requires_enabled_method(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-payment');

        $this->assertFalse($this->getReadiness($user)['items']['payment']);

        PaymentSetting::updateOrCreate(
            ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled'],
            ['value' => '1']
        );
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $this->assertTrue($this->getReadiness($user)['items']['payment']);
    }

    // ── 6. Disabled/incomplete payment does not count ────────────────────

    public function test_disabled_payment_method_does_not_count(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-disabled-pay');

        PaymentSetting::updateOrCreate(
            ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled'],
            ['value' => '0']
        );

        $this->assertFalse($this->getReadiness($user)['items']['payment']);
    }

    // ── 7. Design truth ─────────────────────────────────────────────────

    public function test_design_readiness_reflects_theme_selection(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-design');

        // DEFAULT_TEMPLATE is assigned, so design is ready
        $this->assertTrue($this->getReadiness($user)['items']['design']);
    }

    // ── 8. Publish truth ────────────────────────────────────────────────

    public function test_publish_readiness_reflects_store_status(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-publish');

        // Default = published
        $this->assertTrue($this->getReadiness($user)['items']['published']);

        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $this->assertFalse($this->getReadiness($user)['items']['published']);
    }

    // ── 9. All complete => is_complete true / 100% ──────────────────────

    public function test_all_complete_yields_ready_to_sell_and_100_percent(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-complete');

        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id, 'store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true,
        ]);
        Shipping::create([
            'store_id' => $store->id, 'name' => 'Flat', 'type' => 'flat_rate',
            'cost' => 10, 'is_active' => true, 'zone_type' => 'domestic',
        ]);
        PaymentSetting::updateOrCreate(
            ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled'],
            ['value' => '1']
        );
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $readiness = $this->getReadiness($user);

        $this->assertTrue($readiness['readyToSell']);
        $this->assertSame(100, $readiness['percentage']);
        $this->assertSame(6, $readiness['totalCount']);
        $this->assertSame(6, $readiness['completeCount']);
    }

    // ── 10. Deletion/disable can make item incomplete again ──────────────

    public function test_disabling_product_makes_readiness_incomplete(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-disable');

        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id, 'store_id' => $store->id, 'is_active' => true]);
        $product = Product::create([
            'name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true,
        ]);

        $this->assertTrue($this->getReadiness($user)['items']['products']);

        $product->update(['is_active' => false]);

        $this->assertFalse($this->getReadiness($user)['items']['products']);
    }

    // ── 11. Client store_id cannot influence progress ────────────────────

    public function test_client_store_id_cannot_influence_progress(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-idor');

        // Try to pass a different store_id via query string
        $res = $this->actingAs($user)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('dashboard') . '?store_id=99999');
        $res->assertOk();
        $readiness = $res->json('props.onboarding.readiness');
        // Should still reflect the user's actual current store, not the spoofed one
        $this->assertNotNull($readiness);
        $this->assertTrue($readiness['items']['basics']);
    }

    // ── 12. Percentage calculation ───────────────────────────────────────

    public function test_percentage_is_calculated_correctly(): void
    {
        $user = $this->merchantUser();
        $store = $this->createStore($user, 'checklist-pct');

        $readiness = $this->getReadiness($user);
        // basics=1 + design=1 + published=1 = 3/6 = 50%
        $this->assertSame(50, $readiness['percentage']);
    }
}
