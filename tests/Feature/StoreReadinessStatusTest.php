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
 * P2C-01 — Merchant Store Readiness Status.
 *
 * The dashboard exposes a normalized server-sourced readiness snapshot with the
 * five basics (الأساسيات / المنتجات / المدفوعات / التوصيل / النشر), each
 * READY or NOT READY from real persisted data — never fabricated. `readyToSell`
 * is true only when ALL five are met. The readiness card must not duplicate the
 * single primary next-action CTA (P2B-03 contract preserved).
 */
class StoreReadinessStatusTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Currency::create(['name' => 'Israeli Shekel', 'code' => 'ILS', 'symbol' => '₪']);
    }

    private function merchant(): User
    {
        $user = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $plan = Plan::factory()->create([
            'max_stores' => 5,
            'max_products_per_store' => 100,
            'enable_custdomain' => 'off',
            'enable_custsubdomain' => 'off',
            'template_editor_level' => 'none',
        ]);
        $user->plan_id = $plan->id;
        $user->plan_is_active = 1;
        $user->save();
        return $user;
    }

    private function createStore(User $user, string $slug = 'readystore'): Store
    {
        $store = Store::forceCreate([
            'name' => 'Test Store',
            'slug' => $slug,
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->current_store = $store->id;
        $user->save();
        return $store;
    }

    private function addActiveProduct(Store $store): void
    {
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id . '-' . uniqid(), 'store_id' => $store->id, 'is_active' => true]);
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
        $this->addActiveProduct($store);
        $this->addShipping($store);
        $this->addCodPayment($user, $store);
    }

    private function getReadiness(): array
    {
        $onboarding = $this->get(route('dashboard'))->inertiaPage()['props']['onboarding'];
        $this->assertArrayHasKey('readiness', $onboarding, 'dashboard onboarding must carry a server-sourced readiness snapshot');
        return $onboarding['readiness'];
    }

    public function test_empty_store_has_only_basics_ready_and_products_next(): void
    {
        $user = $this->merchant();
        $this->createStore($user, 'readiness-empty');
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertTrue($readiness['items']['basics'], 'name+slug identity is always present on a created store');
        $this->assertFalse($readiness['items']['products']);
        $this->assertFalse($readiness['items']['payment']);
        $this->assertFalse($readiness['items']['delivery']);
        // Absent store_status means the store is live on its subdomain by default.
        $this->assertTrue($readiness['items']['published']);
        $this->assertFalse($readiness['readyToSell']);
        $this->assertSame(2, $readiness['completeCount']);
        $this->assertSame(5, $readiness['totalCount']);
        $this->assertSame('products', $readiness['nextStep']['key']);
        $this->assertSame(route('products.create'), $readiness['nextStep']['href']);
    }

    public function test_inactive_products_do_not_count_as_sale_ready(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-inactive');
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-in-' . uniqid(), 'store_id' => $store->id, 'is_active' => true]);
        // Draft (inactive) product — the storefront never exposes it.
        Product::create([
            'name' => 'Draft', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => false,
        ]);
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertFalse($readiness['items']['products'], 'products readiness must follow the storefront catalog (active only)');
        $this->assertSame('products', $readiness['nextStep']['key']);
        // The existing commerce readiness must agree: drafts alone are not order capable.
        $onboarding = $this->get(route('dashboard'))->inertiaPage()['props']['onboarding'];
        $this->assertFalse($onboarding['isReadyToPublish']);
        $this->assertSame('add_product', $onboarding['nextAction']['type']);
    }

    public function test_active_product_without_payment_instructs_payment_next(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-payment');
        $this->addActiveProduct($store);
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertTrue($readiness['items']['products']);
        $this->assertFalse($readiness['items']['payment']);
        $this->assertFalse($readiness['readyToSell']);
        $this->assertSame('payment', $readiness['nextStep']['key']);
        $this->assertSame('/stores/' . $store->id . '/settings?tab=payments', $readiness['nextStep']['href']);
    }

    public function test_payment_without_delivery_instructs_delivery_next(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-delivery');
        $this->addActiveProduct($store);
        $this->addCodPayment($user, $store);
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertTrue($readiness['items']['products']);
        $this->assertTrue($readiness['items']['payment']);
        $this->assertFalse($readiness['items']['delivery']);
        $this->assertSame('delivery', $readiness['nextStep']['key']);
        $this->assertSame(route('delivery.index'), $readiness['nextStep']['href']);
    }

    public function test_all_set_but_unpublished_is_not_ready_to_sell(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-publish');
        $this->makeReadyAndLive($user, $store);
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertTrue($readiness['items']['basics']);
        $this->assertTrue($readiness['items']['products']);
        $this->assertTrue($readiness['items']['payment']);
        $this->assertTrue($readiness['items']['delivery']);
        $this->assertFalse($readiness['items']['published']);
        $this->assertFalse($readiness['readyToSell'], 'published state is required for readyToSell');
        $this->assertSame(4, $readiness['completeCount']);
        $this->assertSame('published', $readiness['nextStep']['key']);
        $this->assertSame(route('stores.settings', $store->id) . '?tab=general', $readiness['nextStep']['href']);
        // Existing nextAction priority must agree.
        $onboarding = $this->get(route('dashboard'))->inertiaPage()['props']['onboarding'];
        $this->assertSame('publish_store', $onboarding['nextAction']['type']);
    }

    public function test_fully_ready_store_is_ready_to_sell_with_no_next_step(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-full');
        $this->makeReadyAndLive($user, $store);
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertTrue($readiness['items']['basics']);
        $this->assertTrue($readiness['items']['products']);
        $this->assertTrue($readiness['items']['payment']);
        $this->assertTrue($readiness['items']['delivery']);
        $this->assertTrue($readiness['items']['published']);
        $this->assertTrue($readiness['readyToSell']);
        $this->assertSame(5, $readiness['completeCount']);
        $this->assertNull($readiness['nextStep']);
    }

    public function test_readiness_is_scoped_to_the_current_store(): void
    {
        $userA = $this->merchant();
        $storeA = $this->createStore($userA, 'readiness-scope-a');
        $this->makeReadyAndLive($userA, $storeA);

        $userB = $this->merchant();
        $storeB = $this->createStore($userB, 'readiness-scope-b');
        // Store B has an ACTIVE product only — must not leak into A.
        $this->addActiveProduct($storeB);

        $this->actingAs($userA);
        $readinessA = $this->getReadiness();
        $this->assertTrue($readinessA['readyToSell'], 'merchant A must stay fully ready');
        $this->assertTrue($readinessA['items']['products']);

        $this->actingAs($userB);
        $readinessB = $this->getReadiness();
        $this->assertFalse($readinessB['readyToSell']);
        $this->assertTrue($readinessB['items']['products']);
        $this->assertFalse($readinessB['items']['payment']);
    }

    public function test_products_flag_is_backed_by_real_catalog_not_asserted_elsewhere(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-catalog');
        $this->actingAs($user);

        $this->assertFalse($this->getReadiness()['items']['products']);

        $this->addActiveProduct($store);
        $this->assertTrue($this->getReadiness()['items']['products']);
    }

    public function test_ready_to_sell_never_true_from_optional_steps_alone(): void
    {
        $user = $this->merchant();
        $store = $this->createStore($user, 'readiness-optional');
        // Optional steps (taxes + custom subdomain) must not flip readiness.
        \App\Models\Tax::create(['store_id' => $store->id, 'name' => 'VAT', 'rate' => 16, 'country' => 'PS']);
        $store->custom_subdomain = 'myready';
        $store->enable_custom_subdomain = true;
        $store->save();
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);
        $this->actingAs($user);

        $readiness = $this->getReadiness();

        $this->assertFalse($readiness['readyToSell']);
        $this->assertFalse($readiness['items']['products']);
        $this->assertSame('products', $readiness['nextStep']['key']);
    }

    public function test_single_primary_cta_and_compact_card_render_contract(): void
    {
        $user = $this->merchant();
        $this->createStore($user, 'readiness-cta');
        $this->actingAs($user);
        $this->get(route('dashboard'))->assertOk();

        $source = file_get_contents(resource_path('js/pages/dashboard.tsx'));

        // P2B-03 stays the single primary CTA — no duplicate setup card.
        $this->assertSame(1, substr_count($source, 'nextAction && !isSuperAdmin'), 'exactly one primary next-action card must render');
        $this->assertSame(1, substr_count($source, 'onboarding?.readiness && currentStore && !isSuperAdmin'), 'exactly one compact readiness card must render');
        $this->assertStringNotContainsString('onboarding.steps.find', $source, 'CTA must come from server nextAction, not client first-incomplete-step ordering');

        // Card is server-driven and truthful: READY / NOT READY rows, no fake %.
        $this->assertStringContainsString('جاهزية المتجر للبيع', $source);
        $this->assertStringContainsString('readyToSell', $source, 'success state is derived from server readiness');
        $this->assertStringContainsString('onboarding.readiness.completeCount', $source, 'progress counter comes from real completed count, not padded percent');
        $this->assertStringContainsString('غير جاهز', $source, 'NOT READY is an explicit truthful state per item');
        $this->assertStringNotContainsString('{percent}%', $source, 'no fabricated progress percentage remains');

        // NOT READY rows deep-link to canonical setup routes.
        $this->assertStringContainsString("ready: onboarding.readiness.items.products, href: route('products.create')", $source);
        $this->assertStringContainsString("ready: onboarding.readiness.items.delivery, href: route('delivery.index')", $source);
        $this->assertStringContainsString('/stores/${currentStore.id}/settings?tab=payments', $source);

        // The optional full-step grid remains reachable (collapsed) — steps not deleted.
        $this->assertStringContainsString('عرض جميع الخطوات', $source);
        $this->assertStringContainsString('onboarding.steps.map((step)', $source);
    }
}