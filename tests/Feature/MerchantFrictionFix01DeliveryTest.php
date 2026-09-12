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
 * FIX PACK 01 — plan-aware delivery readiness.
 * Canonical rule: a merchant must NEVER be marked "not ready" because of a
 * feature their current plan does not include.
 */
class MerchantFrictionFix01DeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Currency::create(['name' => 'Israeli Shekel', 'code' => 'ILS', 'symbol' => '₪']);
    }

    private function merchant(string $shippingFlag): array
    {
        $user = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $plan = Plan::factory()->create([
            'max_stores' => 5,
            'max_products_per_store' => 100,
            'enable_custdomain' => 'off',
            'enable_custsubdomain' => 'off',
            'template_editor_level' => 'none',
            'enable_shipping_method' => $shippingFlag,
        ]);
        $user->plan_id = $plan->id;
        $user->plan_is_active = 1;
        $user->save();
        $store = Store::forceCreate([
            'name' => 'Friction Store',
            'slug' => 'friction-' . uniqid(),
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->current_store = $store->id;
        $user->save();

        return [$user->fresh(), $store];
    }

    private function readiness(User $user): array
    {
        $res = $this->actingAs($user)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('dashboard'));
        $res->assertOk();
        $readiness = $res->json('props.onboarding.readiness');
        $this->assertNotNull($readiness);

        return $readiness;
    }

    private function onboarding(User $user): array
    {
        $res = $this->actingAs($user)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('dashboard'));
        $res->assertOk();

        return $res->json('props.onboarding');
    }

    private function addProduct(Store $store): void
    {
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id . '-' . uniqid(), 'store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true,
        ]);
    }

    private function addPayment(User $user, Store $store): void
    {
        PaymentSetting::updateOrCreate(
            ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled'],
            ['value' => '1']
        );
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);
    }

    public function test_starter_without_entitlement_delivery_does_not_block_readiness(): void
    {
        [$user, $store] = $this->merchant('off');
        $this->addProduct($store);
        $this->addPayment($user, $store);

        $onboarding = $this->onboarding($user);
        $this->assertNotContains('الشحن والتوصيل', $onboarding['missingForPublish'] ?? []);
        $this->assertTrue($onboarding['isReadyToPublish'], 'Starter without shipping entitlement must not be blocked by delivery');

        $readiness = $this->readiness($user);
        $this->assertTrue($readiness['readyToSell'], 'Starter with products+payment+live must be ready to sell without delivery');
        $this->assertSame('share_store', $onboarding['nextAction']['type'] ?? $this->onboarding($user)['nextAction']['type']);
    }

    public function test_starter_health_has_no_delivery_issue(): void
    {
        [$user, $store] = $this->merchant('off');
        $readiness = $this->readiness($user);

        // Delivery must be explicitly non-applicable, never counted as incomplete.
        $this->assertArrayHasKey('deliveryApplicable', $readiness);
        $this->assertFalse($readiness['deliveryApplicable']);
        $this->assertSame(5, $readiness['totalCount'], 'Starter readiness denominator must exclude N/A delivery');
    }

    public function test_growth_without_method_is_incomplete(): void
    {
        [$user, $store] = $this->merchant('on');
        $this->addProduct($store);
        $this->addPayment($user, $store);

        $onboarding = $this->onboarding($user);
        $this->assertContains('الشحن والتوصيل', $onboarding['missingForPublish']);
        $this->assertFalse($onboarding['isReadyToPublish']);
        $this->assertSame('setup_delivery', $onboarding['nextAction']['type']);

        $readiness = $this->readiness($user);
        $this->assertTrue($readiness['deliveryApplicable']);
        $this->assertFalse($readiness['items']['delivery']);
        $this->assertFalse($readiness['readyToSell']);
    }

    public function test_growth_health_warning_exists_without_method(): void
    {
        [$user, $store] = $this->merchant('on');
        $this->addProduct($store);
        $this->addPayment($user, $store);
        $readiness = $this->readiness($user);
        $this->assertTrue($readiness['deliveryApplicable']);
        $this->assertFalse($readiness['items']['delivery']);
        $this->assertSame('delivery', $readiness['nextStep']['key']);
    }

    public function test_growth_with_active_method_is_complete(): void
    {
        [$user, $store] = $this->merchant('on');
        $this->addProduct($store);
        $this->addPayment($user, $store);
        Shipping::create([
            'store_id' => $store->id, 'name' => 'Flat', 'type' => 'flat_rate',
            'cost' => 10, 'is_active' => true, 'zone_type' => 'domestic',
        ]);

        $readiness = $this->readiness($user);
        $this->assertTrue($readiness['items']['delivery']);
        $this->assertTrue($readiness['readyToSell']);
    }

    public function test_foreign_store_delivery_does_not_count(): void
    {
        [$userA, $storeA] = $this->merchant('on');
        [$userB, $storeB] = $this->merchant('on');
        Shipping::create([
            'store_id' => $storeB->id, 'name' => 'B ship', 'type' => 'flat_rate',
            'cost' => 10, 'is_active' => true, 'zone_type' => 'domestic',
        ]);

        $readinessA = $this->readiness($userA);
        $this->assertFalse($readinessA['items']['delivery'], 'Store B method must not flip Store A readiness');
    }

    public function test_client_store_id_cannot_affect_readiness(): void
    {
        [$user, $store] = $this->merchant('off');
        $res = $this->actingAs($user)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('dashboard') . '?store_id=99999');
        $res->assertOk();
        $readiness = $res->json('props.onboarding.readiness');
        $this->assertNotNull($readiness);
        $this->assertFalse($readiness['deliveryApplicable']);
    }
}
