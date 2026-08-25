<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignerIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $storeAttrs = []): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Professional-' . uniqid(),
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

        // create store owned by user
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $storeAttrs['name'] ?? 'Test Store';
        $store->slug = $storeAttrs['slug'] ?? 'test-store-' . uniqid();
        $store->theme = $storeAttrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();

        // set current_store
        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    public function test_template_save_persists_and_refresh_retains(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $this->putJson(route('api.store-designer.update', $store->id), [
            'theme' => 'fashion-atelier',
        ])->assertOk()->assertJson(['theme' => 'fashion-atelier']);

        $store->refresh();
        $this->assertSame('fashion-atelier', $store->getTemplateSlug());

        // refresh via GET
        $this->getJson(route('api.store-designer.show', $store->id))
            ->assertOk()
            ->assertJson(['theme' => 'fashion-atelier']);
    }

    public function test_logo_persists_and_is_read_by_storefront(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $logo = '/storage/media/logo.png';
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['logo' => $logo, 'colors' => ['primary' => '#ff0000']],
        ])->assertOk();

        $store->refresh();
        $this->assertSame($logo, $store->design_tokens['logo']);

        // StoreConfiguration mirrored
        $this->assertSame($logo, \App\Models\StoreConfiguration::getConfiguration($store->id)['logo']);

        // ThemeController getStoreConfig should return same logo (public store reads it)
        $controller = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($controller, 'getStoreConfig');
        $ref->setAccessible(true);
        $cfg = $ref->invoke($controller, ['id' => $store->id, 'name' => $store->name]);
        $this->assertSame($logo, $cfg['config']['logo']);
    }

    public function test_colors_typography_radius_persist(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $tokens = [
            'colors' => ['primary' => '#123456', 'secondary' => '#abcdef'],
            'radius' => '24px',
            'typography' => ['font_family' => 'Cairo'],
        ];
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => $tokens,
        ])->assertOk();

        $store->refresh();
        $this->assertSame('#123456', $store->design_tokens['colors']['primary']);
        $this->assertSame('24px', $store->design_tokens['radius']);
        $this->assertSame('Cairo', $store->design_tokens['typography']['font_family']);

        // GET roundtrip
        $this->getJson(route('api.store-designer.show', $store->id))
            ->assertOk()
            ->assertJsonPath('design_tokens.colors.primary', '#123456')
            ->assertJsonPath('design_tokens.radius', '24px');
    }

    public function test_homepage_settings_persist(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'Test Cat', 'slug' => 'test-cat-' . uniqid()]);

        $content = [
            'announcement.text' => 'Free shipping!',
            'announcement.bg_color' => '#111111',
            'settings.show_latest_products' => false,
            'settings.show_best_sellers' => true,
            'settings.homepage_categories' => [(string) $cat->id],
            'settings.homepage_products_per_category' => 4,
        ];
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => $content,
        ])->assertOk();

        $store->refresh();
        $this->assertSame('Free shipping!', $store->store_content['announcement']['text']);
        $this->assertSame(false, $store->store_content['settings']['show_latest_products']);
        $this->assertSame([(string) $cat->id], $store->store_content['settings']['homepage_categories']);

        // merged content via getMergedStoreContent
        $merged = $store->getMergedStoreContent();
        $this->assertSame('Free shipping!', $merged['announcement']['text']);
    }

    public function test_hero_banner_persists(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $payload = [
            'hero_banner.type' => 'image',
            'hero_banner.images' => ['/storage/a.jpg', '/storage/b.jpg'],
            'hero_banner.heading' => 'Sale',
            'hero_banner.overlay_opacity' => 50,
        ];
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => $payload,
        ])->assertOk();

        $store->refresh();
        $this->assertSame('image', $store->store_content['hero_banner']['type']);
        $this->assertSame(['/storage/a.jpg', '/storage/b.jpg'], $store->store_content['hero_banner']['images']);
        $this->assertSame(50, $store->store_content['hero_banner']['overlay_opacity']);
    }

    public function test_switching_template_preserves_merchant_data(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        // create product/category
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        $prod = Product::create([
            'name' => 'Test Product',
            'price' => 99.99,
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'stock' => 10,
        ]);

        // set branding & content
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['logo' => '/storage/logo.png', 'colors' => ['primary' => '#ff0000']],
            'content' => ['announcement.text' => 'hello'],
        ])->assertOk();

        // switch template
        $this->putJson(route('api.store-designer.update', $store->id), [
            'theme' => 'electronics-hub',
        ])->assertOk();

        $store->refresh();
        $this->assertSame('electronics-hub', $store->getTemplateSlug());
        // data preserved
        $this->assertSame('/storage/logo.png', $store->design_tokens['logo']);
        $this->assertSame('hello', $store->store_content['announcement']['text']);
        $this->assertSame(1, Product::where('store_id', $store->id)->count());
        $this->assertSame(1, Category::where('store_id', $store->id)->count());

        // switch back
        $this->putJson(route('api.store-designer.update', $store->id), [
            'theme' => 'bazaar-market',
        ])->assertOk();
        $store->refresh();
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
        $this->assertSame('/storage/logo.png', $store->design_tokens['logo']);
    }

    public function test_unauthorized_store_cannot_update_configuration(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        [$otherUser, $otherStore] = $this->ownerWithStore(['slug' => 'other-store-' . uniqid()]);

        $this->actingAs($otherUser);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'theme' => 'fashion-atelier',
        ])->assertStatus(403);

        $store->refresh();
        $this->assertNotSame('fashion-atelier', $store->getTemplateSlug());
    }

    public function test_refresh_does_not_lose_changes(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['colors' => ['primary' => '#112233'], 'radius' => '20px'],
            'content' => ['hero_banner.heading' => 'Keep me'],
        ])->assertOk();

        // simulate refresh by fetching again
        $first = $this->getJson(route('api.store-designer.show', $store->id))->assertOk()->json();
        $second = $this->getJson(route('api.store-designer.show', $store->id))->assertOk()->json();

        $this->assertSame($first['design_tokens']['colors']['primary'], $second['design_tokens']['colors']['primary']);
        $this->assertSame($first['content']['hero_banner']['heading'], $second['content']['hero_banner']['heading']);
    }

    public function test_preview_and_public_store_use_same_source(): void
    {
        [$user, $store] = $this->ownerWithStore(['theme' => 'grocery-souq']);
        $this->actingAs($user);

        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['logo' => '/storage/preview-logo.png', 'colors' => ['primary' => '#00ff00']],
            'content' => ['announcement.text' => 'Preview Test'],
        ])->assertOk();

        $store->refresh();

        // Public store config (ThemeController getStoreConfig) should reflect same
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl, 'getStoreConfig');
        $m->setAccessible(true);
        $cfg = $m->invoke($ctrl, ['id' => $store->id, 'name' => $store->name]);
        $this->assertSame('/storage/preview-logo.png', $cfg['config']['logo']);

        // Preview theme override should still use design_tokens when ?preview is false?
        // Ensure storeContent preview path also sees announcement
        $this->assertSame('Preview Test', $store->getMergedStoreContent()['announcement']['text']);
    }
}
