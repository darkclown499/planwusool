<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerBannerHeroContentTest extends TestCase
{
    use RefreshDatabase;

    private function makeStoreWithUser(): array
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(['user_id' => $user->id, 'theme' => 'fashion-atelier']);
        // Ensure user current_store points to store for permission check fallback
        $user->current_store = $store->id;
        $user->save();
        $this->actingAs($user);
        return [$user, $store];
    }

    public function test_banner_a_can_have_its_own_title(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-1', 'type' => 'image', 'src' => '/storage/media/1/a.jpg', 'heading' => 'وصلت التشكيلة الجديدة', 'subtitle' => 'اكتشف أحدث المنتجات', 'cta_label' => 'تسوق الآن', 'cta_link' => '#shop', 'show_content' => true],
        ];
        // Bypass ownership by inserting directly via store_content then via API (ownership gate will allow stored_legacy)
        $store->store_content = ['hero_banner' => ['media' => $media, 'images' => ['/storage/media/1/a.jpg']]];
        $store->save();
        // Now update via API adding second banner
        $media2 = [
            ['id' => 'img-1', 'type' => 'image', 'src' => '/storage/media/1/a.jpg', 'heading' => 'وصلت التشكيلة الجديدة', 'subtitle' => 'اكتشف', 'cta_label' => 'تسوق الآن', 'cta_link' => '#shop', 'show_content' => true],
            ['id' => 'vid-1', 'type' => 'video', 'src' => 'https://example.com/video.mp4', 'show_content' => false],
        ];
        // For video external URL, ownership not required, but for image we need to satisfy ownership: create MediaItem row owned
        // Create MediaItem owned for /storage/media/1/a.jpg? That path uses media id 1. We'll create media_items row id 1 owned
        try { \App\Models\MediaItem::query()->create(['id' => 1, 'store_id' => $store->id, 'name' => 'a.jpg', 'file_name' => 'a.jpg']); } catch (\Throwable $e) {}
        try { \Spatie\MediaLibrary\MediaCollections\Models\Media::query()->create(['id' => 1, 'model_type' => \App\Models\MediaItem::class, 'model_id' => 1, 'file_name' => 'a.jpg', 'disk' => 'public', 'store_id' => $store->id, 'collection_name' => 'default', 'name' => 'a', 'mime_type' => 'image/jpeg', 'size' => 100]); } catch (\Throwable $e) {}

        $res = $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media2]]);
        $res->assertOk();
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertCount(2, $saved);
        $this->assertSame('وصلت التشكيلة الجديدة', $saved[0]['heading'] ?? null);
    }

    public function test_banner_b_can_have_different_title(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-a', 'type' => 'image', 'src' => 'https://cdn.example.com/b.jpg', 'heading' => 'خصومات حتى 30%', 'cta_label' => 'اكتشف العروض', 'show_content' => true],
            ['id' => 'img-b', 'type' => 'image', 'src' => 'https://cdn.example.com/c.jpg', 'heading' => 'وصلت التشكيلة الجديدة', 'show_content' => true],
        ];
        $res = $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media]]);
        $res->assertOk();
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertSame('خصومات حتى 30%', $saved[0]['heading']);
        $this->assertSame('وصلت التشكيلة الجديدة', $saved[1]['heading']);
        $this->assertNotSame($saved[0]['heading'], $saved[1]['heading']);
    }

    public function test_banner_c_can_explicitly_have_no_text(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/d.jpg', 'show_content' => false],
        ];
        $res = $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media, 'hero_banner.heading' => 'Global Should Not Leak']]);
        $res->assertOk();
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'][0];
        $this->assertSame(false, $saved['show_content']);
        // Even with global heading, per-media explicit OFF should be preserved and not fallback
        $this->assertFalse($saved['show_content']);
    }

    public function test_saving_preserves_per_media_content(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/e.jpg', 'heading' => 'Title A', 'subtitle' => 'Sub A', 'cta_label' => 'Click', 'cta_link' => '#a', 'show_content' => true],
        ];
        $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media]])->assertOk();
        $store->refresh();
        $first = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('Title A', $first['heading']);
        $this->assertSame('Sub A', $first['subtitle']);
        $this->assertSame('Click', $first['cta_label']);
        $this->assertSame('#a', $first['cta_link']);
    }

    public function test_reload_returns_same_content(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/f.jpg', 'heading' => 'Reload Title', 'show_content' => true],
        ];
        $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media]])->assertOk();
        $res = $this->getJson("/api/stores/{$store->id}/designer");
        $res->assertOk();
        $content = $res->json('content');
        $this->assertSame('Reload Title', $content['hero_banner']['media'][0]['heading'] ?? null);
    }

    public function test_legacy_hero_content_still_works(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/g.jpg'], // no per-media content, show_content null
        ];
        $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media, 'hero_banner.heading' => 'Legacy Global Title', 'hero_banner.subtitle' => 'Legacy Sub']])->assertOk();
        $store->refresh();
        $savedMedia = $store->store_content['hero_banner']['media'][0];
        // legacy media has no show_content -> null, and no heading
        $this->assertNull($savedMedia['show_content'] ?? null);
        $this->assertTrue(empty($savedMedia['heading'] ?? null));
        // global heading should still be stored
        $this->assertSame('Legacy Global Title', $store->store_content['hero_banner']['heading'] ?? null);
    }

    public function test_media_types_support_content(): void
    {
        [$user, $store] = $this->makeStoreWithUser();
        $media = [
            ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/h.jpg', 'heading' => 'Image Title', 'show_content' => true],
            ['id' => 'vid-1', 'type' => 'video', 'src' => 'https://example.com/video.mp4', 'heading' => 'Video Title', 'show_content' => true],
            ['id' => 'yt-1', 'type' => 'youtube', 'src' => 'dQw4w9WgXcQ', 'heading' => 'شاهد المجموعة الجديدة', 'show_content' => true],
        ];
        $res = $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.media' => $media]]);
        $res->assertOk();
        $store->refresh();
        $saved = $store->store_content['hero_banner']['media'];
        $this->assertCount(3, $saved);
        $this->assertSame('Image Title', collect($saved)->firstWhere('type','image')['heading'] ?? null);
        $this->assertSame('Video Title', collect($saved)->firstWhere('type','video')['heading'] ?? null);
        $this->assertSame('شاهد المجموعة الجديدة', collect($saved)->firstWhere('type','youtube')['heading'] ?? null);
    }

    public function test_store_a_cannot_affect_store_b(): void
    {
        $userA = User::factory()->create();
        $storeA = Store::factory()->create(['user_id' => $userA->id]);
        $userB = User::factory()->create();
        $storeB = Store::factory()->create(['user_id' => $userB->id]);
        $userA->current_store = $storeA->id; $userA->save();
        $this->actingAs($userA);
        $mediaA = [['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/i.jpg', 'heading' => 'Store A Title', 'show_content' => true]];
        $this->putJson("/api/stores/{$storeA->id}/designer", ['content' => ['hero_banner.media' => $mediaA]])->assertOk();
        $storeA->refresh(); $storeB->refresh();
        $this->assertSame('Store A Title', $storeA->store_content['hero_banner']['media'][0]['heading'] ?? null);
        $this->assertNull($storeB->store_content['hero_banner']['media'][0]['heading'] ?? null);
        // Ensure store B still empty
        $this->assertEmpty($storeB->store_content['hero_banner']['media'] ?? []);
    }
}
