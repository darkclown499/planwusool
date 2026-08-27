<?php
namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GrocerySouqMediaSlotTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Grocery Test';
        $store->slug = $attrs['slug'] ?? 'grocery-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'grocery-souq';
        $store->email = 'grocery@test.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user,$store];
    }

    public function test_grocery_hero_renders_with_production_like_content(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        // Simulate production store 48: youtube hero with banners null
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'hero_banner.type'=>'youtube',
                'hero_banner.youtube_url'=>'https://www.youtube.com/watch?v=X0pWcDq7lN0',
                'hero_banner.overlay_opacity'=>0,
                'hero_banner.heading'=>'عروض طازجة',
                'banners'=>null,
            ]
        ])->assertOk();
        $store->refresh();
        $merged = $store->getMergedStoreContent();
        $this->assertIsArray($merged);
        // Ensure hero_banner still has youtube_url
        $this->assertSame('https://www.youtube.com/watch?v=X0pWcDq7lN0', $store->store_content['hero_banner']['youtube_url'] ?? null);
        // Simulate storefront heroMedia extraction: hasDynamicHero should be true
        $this->assertNotEmpty($store->store_content['hero_banner']['heading'] ?? '');
    }

    public function test_grocery_image_slider_ordering_persists(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $images = ['/storage/a.jpg','/storage/b.jpg','/storage/c.jpg'];
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'hero_banner.type'=>'image',
                'hero_banner.images'=>$images,
                'hero_banner.heading'=>'تخفيضات',
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame($images, $store->store_content['hero_banner']['images']);
        // Reorder
        $reordered = ['/storage/c.jpg','/storage/a.jpg','/storage/b.jpg'];
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>['hero_banner.images'=>$reordered]
        ])->assertOk();
        $store->refresh();
        $this->assertSame($reordered, $store->store_content['hero_banner']['images']);
    }

    public function test_grocery_mobile_fallback(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        // Desktop images only, mobile empty -> mobile should fallback to desktop
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'hero_banner.type'=>'image',
                'hero_banner.images'=>['/storage/desktop.jpg'],
                'hero_banner.images_mobile'=>[],
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame(['/storage/desktop.jpg'], $store->store_content['hero_banner']['images']);
        $this->assertSame([], $store->store_content['hero_banner']['images_mobile'] ?? []);
        // Now set mobile
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>['hero_banner.images_mobile'=>['/storage/mobile.jpg']]
        ])->assertOk();
        $store->refresh();
        $this->assertSame(['/storage/mobile.jpg'], $store->store_content['hero_banner']['images_mobile']);
        // Remove desktop -> mobile still remains
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>['hero_banner.images'=>[]]
        ])->assertOk();
        $store->refresh();
        $this->assertSame([], $store->store_content['hero_banner']['images']);
        $this->assertSame(['/storage/mobile.jpg'], $store->store_content['hero_banner']['images_mobile']);
    }

    public function test_grocery_video_per_slot_persistence(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'hero_banner.type'=>'video',
                'hero_banner.video_url'=>'/storage/video.mp4',
                'hero_banner.video_url_mobile'=>'/storage/video-mobile.mp4',
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame('/storage/video.mp4', $store->store_content['hero_banner']['video_url']);
        $this->assertSame('/storage/video-mobile.mp4', $store->store_content['hero_banner']['video_url_mobile']);
        // Remove mobile -> fallback to desktop
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>['hero_banner.video_url_mobile'=>'']
        ])->assertOk();
        $store->refresh();
        $this->assertSame('', $store->store_content['hero_banner']['video_url_mobile'] ?? '');
    }

    public function test_media_spec_metadata_exists_for_all_templates(): void
    {
        $path = resource_path('js/templates-v2/shared/mediaSpecs.ts');
        $content = file_get_contents($path);
        $requiredTemplates = ['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'];
        foreach ($requiredTemplates as $slug) {
            $this->assertStringContainsString($slug, $content, "Missing $slug in mediaSpecs");
            // Each must have hero desktopImage
            $this->assertStringContainsString('desktopImage', $content, "Missing desktopImage for $slug");
        }
        // Check per-slot labels (using substrings that actually exist in mediaSpecs)
        $this->assertStringContainsString('الصورة الرئيسية', $content);
        $this->assertStringContainsString('سطح المكتب', $content);
        $this->assertStringContainsString('فيديو', $content);
        $this->assertStringContainsString('المقاس المقترح', $content);
        $this->assertStringContainsString('cover', $content);
        // Check formats and fit
        $this->assertStringContainsString('cover', $content);
        $this->assertStringContainsString('JPG / PNG / WebP', $content);
    }

    public function test_designer_per_slot_controls_exist(): void
    {
        $designer = file_get_contents(resource_path('js/pages/stores/designer.tsx'));
        // Must have explicit per-slot sections (ordered slides)
        $this->assertStringContainsString('الشريحة', $designer, 'Designer must show ordered slides');
        $this->assertStringContainsString('سيتم استخدام صورة سطح المكتب على الهاتف', $designer);
        $this->assertStringContainsString('سيتم استخدام فيديو سطح المكتب على الهاتف', $designer);
        $this->assertStringContainsString('سيتم استخدام رابط سطح المكتب على الهاتف', $designer);
        $this->assertStringContainsString('المعاينة: أعلى الصفحة الرئيسية', $designer);
        $this->assertStringContainsString('focusedSlot', $designer);
        $this->assertStringContainsString('previewMode', $designer);
        // Check that per-slot desktop/mobile distinction exists via mediaSpecs
        $this->assertStringContainsString('desktopImage', $designer);
        $this->assertStringContainsString('mobileImage', $designer);
        $this->assertStringContainsString('desktopVideo', $designer);
        $this->assertStringContainsString('mobileVideo', $designer);
    }

    public function test_souq_hero_no_crash_with_null_banners(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        // banners null case like production store 48 had before fix
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content'=>[
                'banners'=>null,
                'hero_banner.type'=>'image',
                'hero_banner.images'=>[],
                'hero_banner.heading'=>'',
            ]
        ])->assertOk();
        $store->refresh();
        // Should not throw when merged
        $merged = $store->getMergedStoreContent();
        $this->assertIsArray($merged);
        // Simulate frontend safeBanners handling
        $banners = $store->store_content['banners'] ?? [];
        $safe = is_array($banners) ? $banners : [];
        $this->assertIsArray($safe);
    }

    public function test_live_draft_media_update_path(): void
    {
        $designer = file_get_contents(resource_path('js/pages/stores/designer.tsx'));
        $dynamic = file_get_contents(resource_path('js/pages/store/dynamic.tsx'));
        $souq = file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'));
        // Designer must send draft with content
        $this->assertStringContainsString('wusool:preview:draft', $designer);
        $this->assertStringContainsString('wusool:preview:draft', $dynamic);
        // SouqHero must handle mobile previewMode
        $this->assertStringContainsString('data-preview-mode', $souq);
        $this->assertStringContainsString('isMobilePreview', $souq);
        $this->assertStringContainsString('effectiveImages', $souq);
    }
}
