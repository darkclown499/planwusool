<?php

namespace Tests\Feature\Certification;

use App\Models\MediaItem;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

/**
 * CERTIFICATION: Hero media presentation contract.
 *
 * Backend normalization (Api\DesignerController::update) must:
 *  - accept cover/contain, sanitize invalid fit to cover
 *  - keep zoom finite, clamp 1..2, round consistently
 *  - lock zoom to 1 when effective fit is contain (desktop AND mobile)
 *  - default missing desktop position to 50% 50%, clamp/sanitize values
 *  - default missing mobile position to null (frontend falls back to desktop)
 *  - default missing zoom to null (frontend treats as 1)
 *  - persist exact normalized values on save and reload
 *
 * Frontend (shared/heroMedia.ts) must:
 *  - treat per-media overrides as winning over global Hero values
 *  - resolve mobile fallbacks through the documented chain
 */
class HeroMediaCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(): array
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = Store::factory()->create(['user_id' => $user->id, 'theme' => 'fashion-atelier']);
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createOwnedMediaItem(Store $store, string $name, string $fileName): string
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

    private function saveMedia(User $user, Store $store, array $media): void
    {
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['hero_banner.media' => $media],
        ])->assertOk();
    }

    public function test_cover_fit_persisted_and_roundtrips(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'fit-cover.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'fit-cover', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'fitMobile' => 'cover'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('cover', $m['fit']);
        $this->assertSame('cover', $m['fitMobile']);

        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $this->assertSame('cover', $res->json('content.hero_banner.media.0.fit'));
    }

    public function test_contain_fit_persisted(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'fit-contain.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'fit-contain', 'type' => 'image', 'src' => $src, 'fit' => 'contain', 'fitMobile' => 'contain'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('contain', $m['fit']);
        $this->assertSame('contain', $m['fitMobile']);
    }

    public function test_invalid_fit_sanitized_to_cover(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'fit-invalid.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'fit-invalid', 'type' => 'image', 'src' => $src, 'fit' => 'stretched', 'fitMobile' => 'weird'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('cover', $m['fit']);
        $this->assertSame('cover', $m['fitMobile']);
    }

    public function test_zoom_finite_only_and_clamped_1_2(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'zoom-clamp.jpg');
        $this->saveMedia($user, $store, [
            [
                'id' => 'zoom-clamp',
                'type' => 'image',
                'src' => $src,
                'fit' => 'cover',
                'fitMobile' => 'cover',
                'zoom' => '3.5',
                'zoomMobile' => '0.5',
            ],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        // 3.5 clamped to max 2; 0.5 clamped to min 1
        $this->assertEquals(2, $m['zoom']);
        $this->assertEquals(1, $m['zoomMobile']);
    }

    public function test_zoom_non_numeric_ignored_becomes_default_null(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'zoom-nan.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'zoom-nan', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'zoom' => 'abc', 'zoomMobile' => 'xyz'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertNull($m['zoom']);
        $this->assertNull($m['zoomMobile']);
    }

    public function test_zoom_non_finite_ignored(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'zoom-inf.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'zoom-inf', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'zoom' => 'INF', 'zoomMobile' => '-INF'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertNull($m['zoom']);
        $this->assertNull($m['zoomMobile']);
    }

    public function test_zoom_rounded_consistently(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'zoom-round.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'zoom-round', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'zoom' => '1.3333', 'zoomMobile' => '1.6666'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertEquals(1.33, $m['zoom']);
        $this->assertEquals(1.67, $m['zoomMobile']);
    }

    public function test_missing_zoom_defaults_null_normalizes_on_frontend_to_1(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'zoom-default.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'zoom-default', 'type' => 'image', 'src' => $src, 'fit' => 'cover'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertNull($m['zoom'], 'backend stores null zoom when absent');
        $this->assertNull($m['zoomMobile']);
        // Frontend heroMedia must treat missing zoom as 1
        $hm = file_get_contents(resource_path('js/templates-v2/shared/heroMedia.ts'));
        $this->assertMatchesRegularExpression('/Zoom defaults to 1 when absent/', $hm);
        $this->assertMatchesRegularExpression('/No per-media zoom[^\r\n]*default 1/', $hm);
        $this->assertMatchesRegularExpression('/Contain must remain fully visible[^\r\n]*lock zoom to 1/i', $hm);
    }

    public function test_desktop_contain_locks_zoom_to_1(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'contain-desktop.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'contain-desktop', 'type' => 'image', 'src' => $src, 'fit' => 'contain', 'fitMobile' => 'cover', 'zoom' => '1.8'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('contain', $m['fit']);
        // Desktop contain + zoom 1.8 must resolve to 1
        $this->assertEquals(1, $m['zoom'], 'desktop contain + zoom=1.8 must resolve to 1');
    }

    public function test_mobile_contain_locks_zoomMobile_to_1(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'contain-mobile.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'contain-mobile', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'fitMobile' => 'contain', 'zoomMobile' => '1.6'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('contain', $m['fitMobile']);
        $this->assertEquals(1, $m['zoomMobile'], 'mobile contain + zoomMobile=1.6 must resolve to 1');
    }

    public function test_position_defaults_desktop_center_mobile_null(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'pos-default.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'pos-default', 'type' => 'image', 'src' => $src, 'fit' => 'cover'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('50% 50%', $m['position'], 'desktop position defaults to center');
        // positionMobile absent -> null, frontend falls back to desktop position
        $this->assertNull($m['positionMobile']);
    }

    public function test_position_invalid_component_defaults_to_center(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'pos-clamp.jpg');
        // negative component fails the NN% NN% regex -> the device position defaults to 50% 50%
        $this->saveMedia($user, $store, [
            ['id' => 'pos-clamp', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'position' => '150% -20%', 'positionMobile' => '40% 60%'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('50% 50%', $m['position']);
        $this->assertSame('40% 60%', $m['positionMobile']);
    }

    public function test_position_positive_values_clamped_0_100(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'pos-clamp2.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'pos-clamp2', 'type' => 'image', 'src' => $src, 'fit' => 'cover', 'position' => '150% 200%', 'positionMobile' => '10% 90%'],
        ]);
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('100% 100%', $m['position']);
        $this->assertSame('10% 90%', $m['positionMobile']);
    }

    public function test_per_media_overrides_global_hero_values(): void
    {
        [$user, $store] = $this->makeStore();
        $a = $this->createOwnedMediaItem($store, 'Img A', 'ovr-a.jpg');
        $b = $this->createOwnedMediaItem($store, 'Img B', 'ovr-b.jpg');
        $this->saveMedia($user, $store, [
            ['id' => 'ovr-a', 'type' => 'image', 'src' => $a, 'fit' => 'contain', 'fitMobile' => 'cover', 'position' => '10% 20%', 'zoom' => '1.4'],
            ['id' => 'ovr-b', 'type' => 'image', 'src' => $b, 'fit' => 'cover', 'fitMobile' => 'contain', 'position' => '80% 90%', 'zoomMobile' => '1.9'],
        ]);
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];

        $this->assertSame('contain', $saved[0]['fit']);
        $this->assertSame('cover', $saved[0]['fitMobile']);
        $this->assertSame('10% 20%', $saved[0]['position']);
        $this->assertEquals(1, $saved[0]['zoom'], 'contain locks zoom to 1');

        $this->assertSame('cover', $saved[1]['fit']);
        $this->assertSame('contain', $saved[1]['fitMobile']);
        $this->assertSame('80% 90%', $saved[1]['position']);
        $this->assertEquals(1, $saved[1]['zoomMobile'], 'mobile contain locks zoomMobile to 1');
    }

    public function test_backend_persistence_handles_presentation_fields(): void
    {
        [$user, $store] = $this->makeStore();
        $src = $this->createOwnedMediaItem($store, 'Img', 'presentation-full.jpg');
        $this->saveMedia($user, $store, [
            [
                'id' => 'presentation-full',
                'type' => 'video',
                'src' => $src,
                'fit' => 'cover',
                'fitMobile' => 'contain',
                'position' => '40% 25%',
                'positionMobile' => '50% 50%',
                'zoom' => '1.35',
                'zoomMobile' => '1',
            ],
        ]);

        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $m = $res->json('content.hero_banner.media.0');
        $this->assertSame('cover', $m['fit']);
        $this->assertSame('contain', $m['fitMobile']);
        $this->assertSame('40% 25%', $m['position']);
        $this->assertSame('50% 50%', $m['positionMobile']);
        $this->assertEquals(1.35, $m['zoom']);
        $this->assertEquals(1, $m['zoomMobile'], 'mobile contain locks zoomMobile to 1');
    }
}
