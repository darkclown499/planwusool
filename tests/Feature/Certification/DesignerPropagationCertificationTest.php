<?php

namespace Tests\Feature\Certification;

use App\Models\MediaItem;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

/**
 * CERTIFICATION: Designer save / reload contract and template propagation.
 *
 *  - A Hero media item created with full presentation fields must persist the
 *    exact normalized values and survive reload.
 *  - Invalid zoom / position / fit must be safely normalized (not dropped entirely).
 *  - Reordering media[] A,B,C -> C,A,B must survive save/reload with order exact.
 *  - No stale legacy mirror may override canonical media[].
 *
 * Propagation phase: primary color, logo, font and radius must propagate for
 * every template that claims support.
 */
class DesignerPropagationCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(string $theme = 'fashion-atelier'): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Cert-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_products_per_store' => 100,
            'max_stores' => 10,
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'theme' => $theme]);
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createOwnedMedia(Store $store, string $name, string $fileName): string
    {
        $item = MediaItem::create(['name' => $name]);
        $item->store_id = $store->id;
        $item->save();
        Media::create([
            'model_type' => MediaItem::class,
            'model_id' => $item->id,
            'collection_name' => 'images',
            'name' => pathinfo($fileName, PATHINFO_FILENAME),
            'file_name' => $fileName,
            'mime_type' => 'image/jpeg',
            'disk' => 'public',
            'conversions_disk' => 'public',
            'size' => 1024,
            'manipulations' => [],
            'custom_properties' => [],
            'generated_conversions' => [],
            'responsive_images' => [],
            'store_id' => $store->id,
            'user_id' => $store->user_id,
        ]);
        return '/storage/media/' . $item->id . '/' . $fileName;
    }

    public function test_hero_media_full_presentation_roundtrip(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $src = $this->createOwnedMedia($store, 'Video', 'hero-full.mp4');
        $payload = [
            'hero_banner.media' => [[
                'id' => 'hero-full',
                'type' => 'video',
                'src' => $src,
                'fit' => 'cover',
                'position' => '40% 25%',
                'zoom' => '1.35',
                'fitMobile' => 'contain',
                'positionMobile' => '50% 50%',
                'zoomMobile' => '1',
            ]],
        ];
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => $payload])->assertOk();

        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $m = $res->json('content.hero_banner.media.0');

        $this->assertSame('video', $m['type']);
        $this->assertSame('cover', $m['fit']);
        $this->assertSame('40% 25%', $m['position']);
        $this->assertEquals(1.35, $m['zoom']);
        $this->assertSame('contain', $m['fitMobile']);
        $this->assertSame('50% 50%', $m['positionMobile']);
        $this->assertEquals(1, $m['zoomMobile'], 'contain locks zoomMobile to 1');
    }

    public function test_invalid_presentation_values_normalized_safely(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $src = $this->createOwnedMedia($store, 'Img', 'invalid-presentation.jpg');
        $payload = [
            'hero_banner.media' => [[
                'id' => 'invalid-presentation',
                'type' => 'image',
                'src' => $src,
                'fit' => 'weird',
                'fitMobile' => 'stretched',
                'zoom' => '9.9',
                'zoomMobile' => '-2',
                'position' => '150% 110%',
                'positionMobile' => 'abc',
            ]],
        ];
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => $payload])->assertOk();
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        // Invalid fit -> cover; out-of-range zoom clamped; contain lock not triggered since fit=cover.
        $this->assertSame('cover', $m['fit']);
        $this->assertSame('cover', $m['fitMobile']);
        $this->assertEquals(2, $m['zoom']);
        $this->assertEquals(1, $m['zoomMobile']);
        // position clamped into valid NN% NN% range
        $this->assertSame('100% 100%', $m['position']);
        $this->assertSame('50% 50%', $m['positionMobile']);
    }

    public function test_media_reorder_survives_save_reload_correctly(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $a = $this->createOwnedMedia($store, 'A', 'order-a.jpg');
        $b = $this->createOwnedMedia($store, 'B', 'order-b.jpg');
        $c = $this->createOwnedMedia($store, 'C', 'order-c.jpg');

        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => [
            'hero_banner.media' => [
                ['id' => 'a', 'type' => 'image', 'src' => $a],
                ['id' => 'b', 'type' => 'image', 'src' => $b],
                ['id' => 'c', 'type' => 'image', 'src' => $c],
            ],
        ]])->assertOk();

        // Reorder C,A,B
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => [
            'hero_banner.media' => [
                ['id' => 'c', 'type' => 'image', 'src' => $c],
                ['id' => 'a', 'type' => 'image', 'src' => $a],
                ['id' => 'b', 'type' => 'image', 'src' => $b],
            ],
        ]])->assertOk();

        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $ids = array_column($res->json('content.hero_banner.media'), 'id');
        $this->assertSame(['c', 'a', 'b'], $ids, 'reorder must survive reload');
    }

    public function test_no_stale_mirror_overrides_media_order(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $c = $this->createOwnedMedia($store, 'C', 'stale-c.jpg');
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => [
            'hero_banner.media' => [['id' => 'c', 'type' => 'image', 'src' => $c]],
            // stale mirrors must not affect the logical order in media[]
            'hero_banner.images' => ['/storage/nope-a.jpg', '/storage/nope-b.jpg'],
        ]])->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'];
        $this->assertCount(1, $media);
        $this->assertSame($c, $media[0]['src']);
    }

    public function test_primary_logo_font_radius_propagate_all_supported_templates(): void
    {
        $supported = [
            'fashion-atelier',
            'bazaar-market',
            'grocery-souq',
            'bakery-house',
            'electronics-hub',
            'restaurant-menu',
        ];
        foreach ($supported as $theme) {
            [$user, $store] = $this->merchantWithStore($theme);
            $this->actingAs($user);
            $this->putJson(route('api.store-designer.update', $store->id), [
                'design_tokens' => [
                    'logo' => '/storage/logo-' . $theme . '.png',
                    'colors' => ['primary' => '#ABCDEF'],
                    'radius' => '16px',
                    'typography' => ['font_family' => 'Tajawal'],
                ],
            ])->assertOk();
            $store->refresh();
            $this->assertSame('/storage/logo-' . $theme . '.png', $store->design_tokens['logo'], "logo not propagated for $theme");
            $this->assertSame('#ABCDEF', $store->design_tokens['colors']['primary'], "primary not propagated for $theme");
            $this->assertSame('16px', $store->design_tokens['radius'], "radius not propagated for $theme");
            $this->assertSame('Tajawal', $store->design_tokens['typography']['font_family'], "font not propagated for $theme");
        }
    }
}
