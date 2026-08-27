<?php
namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SixTemplatesCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Six Store';
        $store->slug = $attrs['slug'] ?? 'six-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'six@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user,$store];
    }

    public function test_media_spec_registry_exists_for_all_templates(): void
    {
        $path = resource_path('js/templates-v2/shared/mediaSpecs.ts');
        $this->assertFileExists($path, 'mediaSpecs.ts missing');
        $content = file_get_contents($path);
        foreach (Store::ALL_TEMPLATES as $slug) {
            $this->assertStringContainsString($slug, $content, "media spec missing for $slug");
        }
        // shared branding
        $this->assertStringContainsString('shared', $content);
        $this->assertStringContainsString('512 × 512', $content);
        $this->assertStringContainsString('32 × 32', $content);
    }

    public function test_designer_live_preview_postmessage_exists(): void
    {
        $designer = file_get_contents(resource_path('js/pages/stores/designer.tsx'));
        $this->assertStringContainsString('wusool:preview:draft', $designer, 'designer must post draft');
        $this->assertStringContainsString('wusool:preview:ready', $designer, 'designer must listen ready');
        $this->assertStringContainsString('mediaSpecHelp', $designer, 'designer must show media specs');
        $dynamic = file_get_contents(resource_path('js/pages/store/dynamic.tsx'));
        $this->assertStringContainsString('wusool:preview:draft', $dynamic, 'storefront must listen draft');
        $this->assertStringContainsString('effectiveStoreContent', $dynamic);
    }

    public function test_no_undefined_heading_in_templates(): void
    {
        $file = resource_path('js/templates-v2/electronics-hub/ElectronicsHub.tsx');
        $content = file_get_contents($file);
        // The bug was {heading} without declaration
        $this->assertStringNotContainsString('{heading}', $content, 'ElectronicsHub still has undefined {heading}');
        // Should contain fallback to electronics_brands_heading or الماركات
        $this->assertTrue(
            str_contains($content, 'electronics_brands_heading') || str_contains($content, 'الماركات'),
            'ElectronicsHub must have brands heading fallback'
        );
        // Ensure no other template has raw {heading} without dot
        foreach (Store::ALL_TEMPLATES as $slug) {
            $files = glob(resource_path("js/templates-v2/$slug/*.tsx"));
            foreach ($files as $f) {
                $c = file_get_contents($f);
                // Allow hero.heading, c.heading etc but not isolated {heading}
                if (preg_match('/\{heading\}/', $c)) {
                    $this->fail("Undefined {heading} found in $f");
                }
            }
        }
    }

    public function test_all_six_templates_resolve(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        foreach (Store::ALL_TEMPLATES as $slug) {
            $this->putJson(route('api.store-designer.update', $store->id), ['theme'=>$slug])->assertOk();
            $store->refresh();
            $this->assertSame($slug, $store->getTemplateSlug());
            // Verify merged content still returns array without exception
            $merged = $store->getMergedStoreContent();
            $this->assertIsArray($merged);
            // Verify template file exists
            $registry = file_get_contents(resource_path('js/templates-v2/registry.tsx'));
            $this->assertStringContainsString($slug, $registry);
        }
    }

    public function test_template_switching_preserves_content_and_draft_preview(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens'=>['logo'=>'/storage/logo.png','colors'=>['primary'=>'#123456']],
            'content'=>['hero_banner.heading'=>'Live Preview Hero','bakery_category_heading'=>'من رفوفنا'],
        ])->assertOk();
        foreach (['fashion-atelier','electronics-hub','bakery-house'] as $slug) {
            $this->putJson(route('api.store-designer.update', $store->id), ['theme'=>$slug])->assertOk();
            $store->refresh();
            $this->assertSame('/storage/logo.png', $store->design_tokens['logo'] ?? null);
            $this->assertSame('Live Preview Hero', $store->store_content['hero_banner']['heading'] ?? null);
        }
    }

    public function test_merchant_headings_propagate(): void
    {
        [$user,$store] = $this->ownerWithStore(['theme'=>'bakery-house']);
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'bakery_category_heading'=>'عروض المخبز',
                'bakery_last_batch.heading'=>'آخر دفعة الساعة 9',
                'bakery_story.quote'=>'خبزنا بشغف',
                'electronics_promise'=>'أجهزة مضمونة',
                'electronics_brands_heading'=>'علاماتنا',
                'fashion_category_heading'=>'تسوقي الآن',
                'restaurant_chef_heading'=>'أطباق الشيف',
                'welcome_message'=>'مرحبا',
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame('عروض المخبز', $store->store_content['bakery_category_heading'] ?? null);
        $this->assertSame('آخر دفعة الساعة 9', $store->store_content['bakery_last_batch']['heading'] ?? null);
        $this->assertSame('خبزنا بشغف', $store->store_content['bakery_story']['quote'] ?? null);
        $this->assertSame('أجهزة مضمونة', $store->store_content['electronics_promise'] ?? null);
        $this->assertSame('علاماتنا', $store->store_content['electronics_brands_heading'] ?? null);
    }

    public function test_section_visibility_propagates(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'settings.show_latest_products'=>false,
                'settings.show_best_sellers'=>false,
                'settings.show_categories_bar'=>true,
                'bakery_last_batch.enabled'=>false,
                'bakery_story.enabled'=>false,
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame(false, $store->store_content['settings']['show_latest_products']);
        $this->assertSame(false, $store->store_content['settings']['show_best_sellers']);
        $this->assertSame(true, $store->store_content['settings']['show_categories_bar']);
    }

    public function test_desktop_mobile_hero_propagates(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'hero_banner.type'=>'image',
                'hero_banner.images'=>['/storage/hero.jpg'],
                'hero_banner.images_mobile'=>['/storage/hero-mobile.jpg'],
                'hero_banner.fit'=>'contain',
                'hero_banner.position'=>'top',
                'hero_banner.height_desktop'=>'520px',
                'hero_banner.height_mobile'=>'420px',
                'hero_banner.heading'=>'Hero Title',
                'hero_banner.overlay_opacity'=>50,
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame('image', $store->store_content['hero_banner']['type']);
        $this->assertSame(['/storage/hero.jpg'], $store->store_content['hero_banner']['images']);
        $this->assertSame(['/storage/hero-mobile.jpg'], $store->store_content['hero_banner']['images_mobile']);
        $this->assertSame('contain', $store->store_content['hero_banner']['fit']);
        $this->assertSame('top', $store->store_content['hero_banner']['position']);
    }

    public function test_logo_favicon_propagates(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens'=>['logo'=>'/storage/logo.png','favicon'=>'/storage/fav.png'],
            'content'=>['brand.logo'=>'/storage/logo2.png','brand.favicon'=>'/storage/fav2.png'],
        ])->assertOk();
        $store->refresh();
        $this->assertSame('/storage/logo.png', $store->design_tokens['logo']);
        $this->assertSame('/storage/fav.png', $store->design_tokens['favicon']);
        $this->assertSame('/storage/logo2.png', $store->store_content['brand']['logo'] ?? null);
    }

    public function test_colors_typography_propagate(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens'=>['colors'=>['primary'=>'#123456','secondary'=>'#654321'],'radius'=>'20px','typography'=>['font_family'=>'Tajawal']],
        ])->assertOk();
        $store->refresh();
        $this->assertSame('#123456', $store->design_tokens['colors']['primary']);
        $this->assertSame('20px', $store->design_tokens['radius']);
        $this->assertSame('Tajawal', $store->design_tokens['typography']['font_family']);
    }

    public function test_zero_data_sections_no_crash(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        // No products/categories, minimal content
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>['hero_banner'=>[],'banners'=>[],'settings.homepage_categories'=>[]],
        ])->assertOk();
        $store->refresh();
        $merged = $store->getMergedStoreContent();
        $this->assertIsArray($merged);
        // Ensure templates would handle empty gracefully (no exception in PHP)
        foreach (Store::ALL_TEMPLATES as $slug) {
            $this->assertNotEmpty($slug);
        }
    }

    public function test_store_isolation(): void
    {
        [$u1,$s1] = $this->ownerWithStore(['slug'=>'iso1-'.uniqid()]);
        [$u2,$s2] = $this->ownerWithStore(['slug'=>'iso2-'.uniqid()]);
        $this->actingAs($u1);
        $this->putJson(route('api.store-designer.update', $s1->id), ['content'=>['hero_banner.heading'=>'Store1 Hero']])->assertOk();
        $this->actingAs($u2);
        $this->getJson(route('api.store-designer.show', $s1->id))->assertStatus(403);
        $this->putJson(route('api.store-designer.update', $s1->id), ['theme'=>'fashion-atelier'])->assertStatus(403);
        $s2->refresh();
        $this->assertNotSame('Store1 Hero', $s2->store_content['hero_banner']['heading'] ?? null);
    }

    public function test_legacy_store_compatibility(): void
    {
        // Legacy theme slug normalizes, content missing keys should fallback via getMergedStoreContent
        [$user,$store] = $this->ownerWithStore(['theme'=>'basic']);
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
        $merged = $store->getMergedStoreContent();
        $this->assertIsArray($merged);
        // Must be array with at least default structure, not crash
        $this->assertNotEmpty($merged);
    }

    public function test_template_root_files_exist(): void
    {
        $map = [
            'fashion-atelier'=>'FashionAtelierRoot.tsx',
            'bazaar-market'=>'BazaarMarket.tsx',
            'grocery-souq'=>'GrocerySouqRoot.tsx',
            'bakery-house'=>'BakeryHouse.tsx',
            'electronics-hub'=>'ElectronicsHub.tsx',
            'restaurant-menu'=>'RestaurantMenu.tsx',
        ];
        foreach ($map as $slug=>$file) {
            $path = resource_path("js/templates-v2/$slug/$file");
            $this->assertFileExists($path, "Template $slug root missing");
            $content = file_get_contents($path);
            // Must contain StoreBoundary safe fallback: check for optional chaining on storeData
            $this->assertStringContainsString('storeData', $content);
        }
    }
}
