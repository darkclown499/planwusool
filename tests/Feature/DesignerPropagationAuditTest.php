<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignerPropagationAuditTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $storeAttrs = []): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-' . uniqid(),
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
        $store->name = $storeAttrs['name'] ?? 'Audit Store';
        $store->slug = $storeAttrs['slug'] ?? 'audit-' . uniqid();
        $store->theme = $storeAttrs['theme'] ?? 'bazaar-market';
        $store->email = 'audit@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    public function test_all_six_templates_can_be_applied(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        foreach (Store::ALL_TEMPLATES as $slug) {
            $this->putJson(route('api.store-designer.update', $store->id), ['theme' => $slug])
                ->assertOk()->assertJson(['theme' => $slug]);
            $store->refresh();
            $this->assertSame($slug, $store->getTemplateSlug(), "Failed to apply $slug");
        }
    }

    public function test_invalid_template_normalizes_to_default(): void
    {
        [$user, $store] = $this->ownerWithStore(['theme' => 'bazaar-market']);
        $this->actingAs($user);
        // unknown slug normalizes to default via Store::normalizeThemeSlug
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'not-a-real-theme-xyz'])
            ->assertOk();
        $store->refresh();
        $this->assertSame(Store::DEFAULT_TEMPLATE, $store->getTemplateSlug());
    }

    public function test_switching_templates_preserves_all_merchant_data(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'c-' . uniqid()]);
        Product::create(['name' => 'P', 'price' => 10, 'store_id' => $store->id, 'category_id' => $cat->id, 'is_active' => true, 'stock' => 5]);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['logo' => '/storage/logo.png', 'colors' => ['primary' => '#123456'], 'radius' => '12px'],
            'content' => ['announcement.text' => 'keep-me', 'hero_banner.heading' => 'keep-hero'],
            'custom_css' => '.x{color:red}',
        ])->assertOk();

        $order = ['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu','fashion-atelier'];
        foreach ($order as $slug) {
            $this->putJson(route('api.store-designer.update', $store->id), ['theme' => $slug])->assertOk();
            $store->refresh();
            $this->assertSame('/storage/logo.png', $store->design_tokens['logo'], "logo lost after $slug");
            $this->assertSame('keep-me', $store->store_content['announcement']['text'] ?? null, "announcement lost after $slug");
            $this->assertSame('keep-hero', $store->store_content['hero_banner']['heading'] ?? null, "hero lost after $slug");
            $this->assertSame(1, Product::where('store_id', $store->id)->count(), "products lost after $slug");
        }
    }

    public function test_hero_removal_results_in_no_hero(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['hero_banner.type' => 'image', 'hero_banner.images' => ['/storage/a.jpg'], 'hero_banner.heading' => 'Hi'],
        ])->assertOk();
        // remove images and heading
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['hero_banner.images' => [], 'hero_banner.heading' => '', 'hero_banner.subtitle' => '', 'hero_banner.cta_label' => ''],
        ])->assertOk();
        $store->refresh();
        $imgs = $store->store_content['hero_banner']['images'] ?? null;
        $this->assertTrue(empty($imgs) || $imgs === [], 'hero images not cleared');
    }

    public function test_banner_removal(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['banners' => [['image' => '/storage/b.jpg', 'title' => 'T']]],
        ])->assertOk();
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['banners' => []],
        ])->assertOk();
        $store->refresh();
        $this->assertSame([], $store->store_content['banners'] ?? []);
    }

    public function test_announcement_empty_not_leaking_demo(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['announcement.text' => '', 'announcement.enabled' => false],
        ])->assertOk();
        $store->refresh();
        $merged = $store->getMergedStoreContent();
        // merged default text is '', enabled false should stay false
        $this->assertSame('', $merged['announcement']['text'] ?? '');
        $this->assertSame(false, $merged['announcement']['enabled'] ?? null);
    }

    public function test_section_visibility_and_ordering(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $cat1 = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'c1-' . uniqid()]);
        $cat2 = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'c2-' . uniqid()]);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => [
                'settings.show_latest_products' => false,
                'settings.show_best_sellers' => false,
                'settings.homepage_categories' => [(string)$cat1->id, (string)$cat2->id],
                'settings.homepage_products_per_category' => 4,
                'settings.show_categories_bar' => true,
            ],
        ])->assertOk();
        $store->refresh();
        $this->assertSame(false, $store->store_content['settings']['show_latest_products']);
        $this->assertSame([(string)$cat1->id, (string)$cat2->id], $store->store_content['settings']['homepage_categories']);
        // disable then re-enable
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => ['settings.show_latest_products' => true]])->assertOk();
        $store->refresh();
        $this->assertSame(true, $store->store_content['settings']['show_latest_products']);
        // reorder categories
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => ['settings.homepage_categories' => [(string)$cat2->id, (string)$cat1->id]]])->assertOk();
        $store->refresh();
        $this->assertSame([(string)$cat2->id, (string)$cat1->id], $store->store_content['settings']['homepage_categories']);
    }

    public function test_custom_css_propagates_to_live(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $css = '.my-test{ color: #123456; }';
        $this->putJson(route('api.store-designer.update', $store->id), ['custom_css' => $css])->assertOk();
        $store->refresh();
        $cfg = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $this->assertSame($css, $cfg['custom_css']);
        $this->assertSame($css, $store->template_overrides['custom_css'] ?? null);
    }

    public function test_free_shipping_threshold_propagates(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => ['free_shipping_threshold' => '500']])->assertOk();
        $store->refresh();
        $this->assertSame('500', (string)($store->store_content['free_shipping_threshold'] ?? ''));
        // update via settings path also
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => ['settings.free_shipping_threshold' => '750']])->assertOk();
        $store->refresh();
        $this->assertSame('750', (string)($store->store_content['settings']['free_shipping_threshold'] ?? ''));
    }

    public function test_welcome_message_propagates(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => ['welcome_message' => 'مرحبا بكم']])->assertOk();
        $store->refresh();
        $cfg = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('مرحبا بكم', $cfg['welcome_message'] ?? $store->store_content['welcome_message'] ?? '');
        // verify ThemeController reads it via fallback
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl, 'getStoreConfig');
        $m->setAccessible(true);
        $out = $m->invoke($ctrl, ['id' => $store->id, 'name' => $store->name]);
        $this->assertSame('مرحبا بكم', $out['config']['welcomeMessage']);
    }

    public function test_legacy_store_config_fallback(): void
    {
        // Store with theme_config=bazaar but no design_tokens should still render default template
        [$user, $store] = $this->ownerWithStore(['theme' => 'basic']);
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
    }

    public function test_store_isolation(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        [$other, $otherStore] = $this->ownerWithStore(['slug' => 'other-' . uniqid()]);
        $this->actingAs($other);
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'fashion-atelier'])->assertStatus(403);
        $this->getJson(route('api.store-designer.show', $store->id))->assertStatus(403);
    }
}
