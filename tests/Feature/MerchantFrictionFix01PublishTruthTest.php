<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Currency;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * FIX PACK 01 — publish truth contract.
 * PUBLISH STATUS reflects ONLY store_status runtime state.
 * SETUP READINESS reflects applicable setup tasks. Never conflated.
 */
class MerchantFrictionFix01PublishTruthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Currency::create(['name' => 'Israeli Shekel', 'code' => 'ILS', 'symbol' => '₪']);
    }

    private function merchant(string $shippingFlag = 'off'): array
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
            'name' => 'Publish Store',
            'slug' => 'publish-' . uniqid(),
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->current_store = $store->id;
        $user->save();

        return [$user->fresh(), $store];
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

    private function dashboardSource(): string
    {
        return file_get_contents(resource_path('js/pages/dashboard.tsx'));
    }

    public function test_live_store_reports_published(): void
    {
        [$user, $store] = $this->merchant();
        $onboarding = $this->onboarding($user);
        $this->assertTrue($onboarding['isPublishable']);
        $this->assertTrue($onboarding['readiness']['items']['published']);
    }

    public function test_live_plus_incomplete_setup_must_not_say_not_ready_to_publish(): void
    {
        // Live store with no products/payments: published=true, setup incomplete.
        [$user, $store] = $this->merchant();
        $onboarding = $this->onboarding($user);
        $this->assertTrue($onboarding['isPublishable'], 'fixture store is live by default');

        $source = $this->dashboardSource();
        // The hard "not ready to publish" warning must be gated on unpublished
        // state — a live store gets soft non-blocking copy instead.
        $this->assertStringContainsString('متجرك منشور، لكن هناك إعدادات ننصح بإكمالها', $source);
        // The warning card condition must reference isPublishable === false.
        $this->assertMatchesRegularExpression('/isPublishable\s*===\s*false/', $source);
    }

    public function test_unpublished_state_is_correct(): void
    {
        [$user, $store] = $this->merchant();
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $onboarding = $this->onboarding($user);
        $this->assertFalse($onboarding['isPublishable']);
        $this->assertFalse($onboarding['readiness']['items']['published']);
    }

    public function test_incomplete_and_unpublished_concepts_stay_distinguishable(): void
    {
        [$user, $store] = $this->merchant();
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $onboarding = $this->onboarding($user);
        // Publish state (false) and setup state (also incomplete) are separate keys.
        $this->assertArrayHasKey('isPublishable', $onboarding);
        $this->assertArrayHasKey('isReadyToPublish', $onboarding);
        $this->assertFalse($onboarding['isPublishable']);
        // Starter without products is not setup-complete either.
        $this->assertFalse($onboarding['isReadyToPublish']);
        $this->assertFalse($onboarding['readiness']['readyToSell']);
    }

    public function test_complete_and_published_is_fully_ready(): void
    {
        [$user, $store] = $this->merchant('off');
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id . '-' . uniqid(), 'store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/tmp/a.jpg',
            'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true,
        ]);
        PaymentSetting::updateOrCreate(
            ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled'],
            ['value' => '1']
        );
        StoreConfiguration::forgetConfiguration($store->id);
        Cache::forget('store_configuration.' . $store->id);

        $onboarding = $this->onboarding($user);
        $this->assertTrue($onboarding['isPublishable']);
        $this->assertTrue($onboarding['readiness']['readyToSell']);
        $this->assertTrue($onboarding['isReadyToPublish']);
    }
}
