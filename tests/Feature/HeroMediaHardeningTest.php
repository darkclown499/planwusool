<?php

namespace Tests\Feature;

use App\Models\MediaItem;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class HeroMediaHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(): array
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(['user_id' => $user->id, 'theme' => 'fashion-atelier']);
        return [$user, $store];
    }

    /**
     * Create a REAL MediaItem + Spatie media row scoped to $store and return
     * the canonical local path: /storage/media/{media_item_id}/{file_name}.
     */
    private function createOwnedMediaItem(Store $store, string $name, string $fileName, string $mimeType = 'image/jpeg', string $disk = 'public'): string
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
            'mime_type' => $mimeType,
            'disk' => $disk,
            'conversions_disk' => $disk,
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

    private function saveCanonicalMedia(Store $store, array $media): void
    {
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['hero_banner.media' => $media],
        ])->assertOk();
    }

    public function test_canonical_mixed_media_save_read_round_trip(): void
    {
        [$userA, $storeA] = $this->makeStore();
        $this->actingAs($userA);

        $imgA = $this->createOwnedMediaItem($storeA, 'Image A', 'img-a.jpg');
        $vidA = $this->createOwnedMediaItem($storeA, 'Video A', 'vid-a.mp4', 'video/mp4');
        $imgB = $this->createOwnedMediaItem($storeA, 'Image B', 'img-b.jpg');
        $form = ['img-a', 'vid-a', 'img-b', 'yt-a'];

        $this->saveCanonicalMedia($storeA, [
            ['id' => 'img-a', 'type' => 'image', 'src' => $imgA],
            ['id' => 'vid-a', 'type' => 'video', 'src' => $vidA, 'position' => '20% 50%', 'positionMobile' => '70% 30%'],
            ['id' => 'img-b', 'type' => 'image', 'src' => $imgB],
            ['id' => 'yt-a', 'type' => 'youtube', 'src' => 'dQw4w9WgXcQ'],
        ]);

        $storeA->refresh();
        $saved = $storeA->store_content['hero_banner']['media'];

        // Canonical order is Image A -> Video A -> Image B -> YouTube A.
        $this->assertEquals($form, array_column($saved, 'id'));
        $this->assertEquals(['image', 'video', 'image', 'youtube'], array_column($saved, 'type'));
        $this->assertCount(4, $saved);

        // Unchanged ids / src / srcMobile / crop.
        $this->assertEquals('img-a', $saved[0]['id']);
        $this->assertEquals($imgA, $saved[0]['src']);
        $this->assertNull($saved[0]['srcMobile']);

        $this->assertEquals('vid-a', $saved[1]['id']);
        $this->assertEquals($vidA, $saved[1]['src']);
        $this->assertNull($saved[1]['srcMobile']);
        $this->assertEquals('20% 50%', $saved[1]['position']);
        $this->assertEquals('70% 30%', $saved[1]['positionMobile']);

        $this->assertEquals('img-b', $saved[2]['id']);
        $this->assertEquals($imgB, $saved[2]['src']);

        $this->assertEquals('yt-a', $saved[3]['id']);
        $this->assertEquals('dQw4w9WgXcQ', $saved[3]['src']);

        // Compatibility mirrors.
        $hb = $storeA->store_content['hero_banner'];
        $this->assertEquals([$imgA, $imgB], $hb['images']);
        $this->assertEquals($vidA, $hb['video_url']);
        $this->assertEquals('https://www.youtube.com/watch?v=dQw4w9WgXcQ', $hb['youtube_url']);

        // Canonical order MUST NOT be reconstructed from mirrors: index 1 is a video.
        $this->assertEquals('video', $saved[1]['type']);
        $this->assertNotEquals($hb['images'][0], $saved[1]['src']);

        // Re-read through the real show endpoint.
        $res = $this->getJson(route('api.store-designer.show', $storeA->id))->assertOk();
        $apiSaved = $res->json('content.hero_banner.media');
        $this->assertEquals($form, array_column($apiSaved, 'id'));
        $this->assertEquals('70% 30%', $apiSaved[1]['positionMobile']);
    }

    public function test_legacy_images_mobile_pairing_survives_save(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $imgA = $this->createOwnedMediaItem($store, 'Image A', 'img-a.jpg');
        $imgB = $this->createOwnedMediaItem($store, 'Image B', 'img-b.jpg');
        $mobA = $this->createOwnedMediaItem($store, 'Image A mobile', 'img-a-mobile.jpg');
        $mobB = $this->createOwnedMediaItem($store, 'Image B mobile', 'img-b-mobile.jpg');

        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => [
                'hero_banner.images' => [$imgA, $imgB],
                'hero_banner.images_mobile' => [$mobA, $mobB],
            ],
        ])->assertOk();

        $store->refresh();
        $hb = $store->store_content['hero_banner'];

        // Index-pairing survives the round trip: images[i] <-> images_mobile[i].
        $this->assertEquals([$imgA, $imgB], $hb['images']);
        $this->assertEquals([$mobA, $mobB], $hb['images_mobile']);
        $this->assertCount(2, $hb['images']);
        $this->assertCount(2, $hb['images_mobile']);
        $this->assertEquals($mobA, $hb['images_mobile'][0]);
        $this->assertEquals($mobB, $hb['images_mobile'][1]);
    }

    public function test_canonical_media_overrides_conflicting_legacy_type(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $vidA = $this->createOwnedMediaItem($store, 'Video A', 'vid-a.mp4', 'video/mp4');
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => [
                'hero_banner.media' => [['id' => 'vid-a', 'type' => 'video', 'src' => $vidA]],
                'hero_banner.type' => 'image',
                'hero_banner.images' => ['/storage/stale.jpg'],
            ],
        ])->assertOk();

        $store->refresh();
        $hb = $store->store_content['hero_banner'];
        $this->assertEquals('video', $hb['media'][0]['type']);
        $this->assertEquals($vidA, $hb['media'][0]['src']);
        // Derived legacy image list reflects canonical (no stale image).
        $this->assertEquals([], $hb['images']);
    }

    public function test_configured_video_does_not_use_fallback_banner(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $vidA = $this->createOwnedMediaItem($store, 'Video A', 'vid-a.mp4', 'video/mp4');
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => [
                'hero_banner.media' => [['id' => 'vid-a', 'type' => 'video', 'src' => $vidA]],
                'hero_banner.type' => 'image',
                'hero_banner.images' => ['/storage/stale.jpg'],
            ],
        ])->assertOk();

        $store->refresh();
        $hb = $store->store_content['hero_banner'];
        // Video A is the merchant media; no stale legacy image, no fallback slides,
        // no synthetic demo banner in the persisted content.
        $this->assertCount(1, $hb['media']);
        $this->assertEquals('video', $hb['media'][0]['type']);
        $this->assertEquals($vidA, $hb['media'][0]['src']);
        $this->assertArrayNotHasKey('slides', $hb);
        $this->assertNull(data_get($store->store_content, 'hero_demo_banner'));
        $this->assertEquals($vidA, $hb['video_url']);
        $this->assertEquals([], $hb['images']);
    }

    public function test_desktop_and_mobile_crop_persist(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $vidA = $this->createOwnedMediaItem($store, 'Video A', 'vid-a.mp4', 'video/mp4');
        $vidB = $this->createOwnedMediaItem($store, 'Video B', 'vid-b.mp4', 'video/mp4');

        $this->saveCanonicalMedia($store, [
            ['id' => 'vid-a', 'type' => 'video', 'src' => $vidA, 'position' => '20% 50%', 'positionMobile' => '70% 30%'],
            ['id' => 'vid-b', 'type' => 'video', 'src' => $vidB, 'position' => '80% 30%', 'positionMobile' => '30% 70%'],
        ]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertEquals('20% 50%', $saved[0]['position']);
        $this->assertEquals('70% 30%', $saved[0]['positionMobile']);
        $this->assertEquals('80% 30%', $saved[1]['position']);
        $this->assertEquals('30% 70%', $saved[1]['positionMobile']);
    }

    public function test_total_media_limit_is_ten(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $media = [];
        for ($i = 0; $i < 10; $i++) {
            $media[] = ['id' => "img-$i", 'type' => 'image', 'src' => $this->createOwnedMediaItem($store, "Image $i", "img-$i.jpg")];
        }
        $media[] = ['id' => 'overflow-1', 'type' => 'image', 'src' => '/storage/nope-1.jpg'];
        $media[] = ['id' => 'overflow-2', 'type' => 'image', 'src' => '/storage/nope-2.jpg'];

        $this->saveCanonicalMedia($store, $media);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(10, $saved);
        $this->assertEquals('img-0', $saved[0]['id']);
        $this->assertEquals('img-9', $saved[9]['id']);
    }

    public function test_invalid_youtube_rejected(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $this->saveCanonicalMedia($store, [
            ['id' => 'yt-bad', 'type' => 'youtube', 'src' => 'bad-id'],
            ['id' => 'yt-good', 'type' => 'youtube', 'src' => 'dQw4w9WgXcQ'],
        ]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(1, $saved);
        $this->assertEquals('dQw4w9WgXcQ', $saved[0]['src']);
    }

    public function test_own_store_media_src_accepted(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $imgA = $this->createOwnedMediaItem($store, 'Image A', 'img-a.jpg');
        $this->saveCanonicalMedia($store, [['id' => 'img-a', 'type' => 'image', 'src' => $imgA]]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(1, $saved);
        $this->assertEquals($imgA, $saved[0]['src']);

        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $this->assertEquals($imgA, $res->json('content.hero_banner.media.0.src'));
    }

    public function test_own_store_media_src_mobile_accepted(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $imgA = $this->createOwnedMediaItem($store, 'Image A', 'img-a.jpg');
        $mobA = $this->createOwnedMediaItem($store, 'Image A mobile', 'img-a-mobile.jpg');
        $this->saveCanonicalMedia($store, [['id' => 'img-a', 'type' => 'image', 'src' => $imgA, 'srcMobile' => $mobA]]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(1, $saved);
        $this->assertEquals($imgA, $saved[0]['src']);
        $this->assertEquals($mobA, $saved[0]['srcMobile']);
    }

    public function test_foreign_store_src_rejected(): void
    {
        [$userA, $storeA] = $this->makeStore();
        [, $storeB] = $this->makeStore();
        $this->actingAs($userA);

        $foreignImg = $this->createOwnedMediaItem($storeB, 'Foreign Image', 'foreign.jpg');
        $this->saveCanonicalMedia($storeA, [['id' => 'foreign', 'type' => 'image', 'src' => $foreignImg]]);

        $storeA->refresh();
        $saved = $storeA->store_content['hero_banner']['media'];
        $this->assertCount(0, $saved);
        $this->assertNotContains($foreignImg, $saved);
    }

    public function test_foreign_store_src_mobile_rejected(): void
    {
        [$userA, $storeA] = $this->makeStore();
        [, $storeB] = $this->makeStore();
        $this->actingAs($userA);

        $ownImg = $this->createOwnedMediaItem($storeA, 'Own Image', 'own.jpg');
        $foreignMob = $this->createOwnedMediaItem($storeB, 'Foreign Mobile', 'foreign-mobile.jpg');
        $this->saveCanonicalMedia($storeA, [['id' => 'own', 'type' => 'image', 'src' => $ownImg, 'srcMobile' => $foreignMob]]);

        $storeA->refresh();
        $saved = $storeA->store_content['hero_banner']['media'];
        // Whole item is dropped when srcMobile is foreign.
        $this->assertCount(0, $saved);
    }

    public function test_unknown_local_storage_path_rejected(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        $this->saveCanonicalMedia($store, [['id' => 'ghost', 'type' => 'image', 'src' => '/storage/media/999999/ghost.jpg']]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(0, $saved);
        $this->assertEquals([], $store->store_content['hero_banner']['images']);
    }

    public function test_owned_media_item_with_fake_filename_rejected(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        // Real owned MediaItem whose real file is img-a.jpg on disk.
        $item = MediaItem::create(['name' => 'Image A']);
        $item->store_id = $store->id;
        $item->save();
        Media::create([
            'model_type' => MediaItem::class,
            'model_id' => $item->id,
            'collection_name' => 'images',
            'name' => 'img-a',
            'file_name' => 'img-a.jpg',
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

        // Owned id, but a filename that is NOT the real referenced file.
        $fakePath = '/storage/media/' . $item->id . '/fake.jpg';
        $this->saveCanonicalMedia($store, [['id' => 'fake', 'type' => 'image', 'src' => $fakePath]]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(0, $saved);
    }

    public function test_wrong_model_type_same_model_id_rejected(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        // Same numeric model_id, but the Spatie media row belongs to a non-MediaItem
        // model_type. The MediaItem ownership query must not match it.
        $item = MediaItem::create(['name' => 'Image A']);
        $item->store_id = $store->id;
        $item->save();
        Media::create([
            'model_type' => 'App\Models\Product',
            'model_id' => $item->id,
            'collection_name' => 'images',
            'name' => 'img-a',
            'file_name' => 'img-a.jpg',
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

        $path = '/storage/media/' . $item->id . '/img-a.jpg';
        $this->saveCanonicalMedia($store, [['id' => 'wrong-model', 'type' => 'image', 'src' => $path]]);

        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(0, $saved);
    }

    public function test_legacy_existing_server_path_exception_works_only_for_unchanged_path(): void
    {
        [$user, $store] = $this->makeStore();
        $this->actingAs($user);

        // Historical store: a legacy local path lives SERVER-SIDE inside saved hero content.
        $legacyPath = '/storage/media/7/legacy.jpg';
        $store->store_content = ['hero_banner' => ['type' => 'image', 'images' => [$legacyPath]]];
        $store->save();

        // The exact unchanged path is resubmitted as canonical media -> allowed via legacy exception.
        $this->saveCanonicalMedia($store, [['id' => 'legacy', 'type' => 'image', 'src' => $legacyPath]]);
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(1, $saved);
        $this->assertEquals($legacyPath, $saved[0]['src']);

        // A MODIFIED path (new filename) is not stored server-side -> rejected.
        $this->saveCanonicalMedia($store, [['id' => 'modified', 'type' => 'image', 'src' => '/storage/media/7/legacy_modified.jpg']]);
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(0, $saved);
    }
}