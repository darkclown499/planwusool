<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HeroMediaCropFocalTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Crop-'.uniqid(),
            'price' => 0,
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
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->current_store = $store->id; $user->save();
        try {
            $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'crop-'.uniqid(), 'guard_name' => 'web']);
            $user->assignRole($role);
        } catch (\Throwable $e) {
            $user->type = 'superadmin'; $user->save();
        }
        return [$user, $store];
    }

    private function putDesigner(User $user, Store $store, array $content)
    {
        $this->actingAs($user);
        return $this->putJson(route('api.store-designer.update', $store->id), ['content' => $content]);
    }

    public function test_image_desktop_focal_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/hero1.jpg', 'position' => '20% 80%', 'positionMobile' => '50% 50%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertCount(1, $media);
        $this->assertSame('20% 80%', $media[0]['position']);
        $this->assertSame('50% 50%', $media[0]['positionMobile']);
    }

    public function test_image_mobile_focal_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/hero1.jpg', 'position' => '50% 50%', 'positionMobile' => '30% 70%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertSame('30% 70%', $media[0]['positionMobile']);
        // desktop unchanged
        $this->assertSame('50% 50%', $media[0]['position']);
    }

    public function test_video_desktop_focal_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'vid-1', 'type' => 'video', 'src' => 'https://cdn.example.com/hero.mp4', 'position' => '10% 90%', 'positionMobile' => '50% 50%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertSame('video', $media[0]['type']);
        $this->assertSame('10% 90%', $media[0]['position']);
    }

    public function test_video_mobile_focal_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'vid-1', 'type' => 'video', 'src' => 'https://cdn.example.com/hero.mp4', 'position' => '50% 50%', 'positionMobile' => '75% 25%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertSame('75% 25%', $media[0]['positionMobile']);
    }

    public function test_banner_isolation(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'img-a', 'type' => 'image', 'src' => 'https://cdn.example.com/a.jpg', 'position' => '10% 10%'],
                ['id' => 'img-b', 'type' => 'image', 'src' => 'https://cdn.example.com/b.jpg', 'position' => '90% 90%'],
                ['id' => 'vid-c', 'type' => 'video', 'src' => 'https://cdn.example.com/c.mp4', 'position' => '30% 40%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertSame('10% 10%', collect($media)->firstWhere('id','img-a')['position']);
        $this->assertSame('90% 90%', collect($media)->firstWhere('id','img-b')['position']);
        $this->assertSame('30% 40%', collect($media)->firstWhere('id','vid-c')['position']);
        // update only B
        $payload2 = [
            'hero_banner.media' => [
                ['id' => 'img-a', 'type' => 'image', 'src' => 'https://cdn.example.com/a.jpg', 'position' => '10% 10%'],
                ['id' => 'img-b', 'type' => 'image', 'src' => 'https://cdn.example.com/b.jpg', 'position' => '50% 50%'],
                ['id' => 'vid-c', 'type' => 'video', 'src' => 'https://cdn.example.com/c.mp4', 'position' => '30% 40%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload2)->assertOk();
        $store->refresh();
        $media2 = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertSame('10% 10%', collect($media2)->firstWhere('id','img-a')['position']);
        $this->assertSame('50% 50%', collect($media2)->firstWhere('id','img-b')['position']);
        $this->assertSame('30% 40%', collect($media2)->firstWhere('id','vid-c')['position']);
    }

    public function test_saved_values_survive_reload(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/hero1.jpg', 'position' => '33% 66%','positionMobile'=>'12% 88%'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        // simulate reload via show endpoint
        $this->actingAs($user);
        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $json = $res->json();
        $media = $json['content']['hero_banner']['media'] ?? [];
        $this->assertSame('33% 66%', $media[0]['position']);
        $this->assertSame('12% 88%', $media[0]['positionMobile']);
    }

    public function test_store_isolation(): void
    {
        [$userA, $storeA] = $this->merchantWithStore();
        [$userB, $storeB] = $this->merchantWithStore();
        $payloadA = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/a.jpg', 'position' => '10% 20%'],
            ],
        ];
        $this->putDesigner($userA, $storeA, $payloadA)->assertOk();
        $payloadB = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/b.jpg', 'position' => '90% 80%'],
            ],
        ];
        $this->putDesigner($userB, $storeB, $payloadB)->assertOk();
        $storeA->refresh(); $storeB->refresh();
        $this->assertSame('10% 20%', $storeA->store_content['hero_banner']['media'][0]['position']);
        $this->assertSame('90% 80%', $storeB->store_content['hero_banner']['media'][0]['position']);
    }

    public function test_existing_without_custom_focal_renders_default(): void
    {
        [$user, $store] = $this->merchantWithStore();
        // Save without explicit position fields -> should default to 50% 50%
        $payload = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/hero1.jpg'],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $media = $store->store_content['hero_banner']['media'] ?? [];
        $this->assertSame('50% 50%', $media[0]['position']);
    }

    public function test_per_banner_text_remains_intact_after_crop_save(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $payload = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/hero1.jpg', 'position'=>'20% 30%', 'heading'=>'Sale', 'subtitle'=>'New', 'cta_label'=>'Shop', 'cta_link'=>'#shop', 'show_content'=>true],
            ],
        ];
        $this->putDesigner($user, $store, $payload)->assertOk();
        $store->refresh();
        $m = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('20% 30%', $m['position']);
        $this->assertSame('Sale', $m['heading']);
        $this->assertSame('New', $m['subtitle']);
        $this->assertSame('Shop', $m['cta_label']);
        // update crop only
        $payload2 = [
            'hero_banner.media' => [
                ['id' => 'img-1', 'type' => 'image', 'src' => 'https://cdn.example.com/hero1.jpg', 'position'=>'80% 90%', 'heading'=>'Sale', 'subtitle'=>'New', 'cta_label'=>'Shop', 'cta_link'=>'#shop', 'show_content'=>true],
            ],
        ];
        $this->putDesigner($user, $store, $payload2)->assertOk();
        $store->refresh();
        $m2 = $store->store_content['hero_banner']['media'][0];
        $this->assertSame('80% 90%', $m2['position']);
        $this->assertSame('Sale', $m2['heading']);
    }
}
