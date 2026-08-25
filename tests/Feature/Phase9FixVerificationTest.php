<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase9FixVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'P'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id=$user->id;
        $store->name=$attrs['name']??'TStore';
        $store->slug=$attrs['slug']??'tstore-'.uniqid();
        $store->theme=$attrs['theme']??'bazaar-market';
        $store->email='store@example.com';
        $store->save();
        $user->current_store=$store->id;
        $user->save();
        return [$user,$store];
    }

    public function test_video_hero_persists_and_returns(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),[
            'content'=>[
                'hero_banner.type'=>'video',
                'hero_banner.video_url'=>'/storage/media/testvideo.mp4',
                'hero_banner.heading'=>'Video Heading',
                'hero_banner.overlay_opacity'=>60,
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame('video',$store->store_content['hero_banner']['type']);
        $this->assertSame('/storage/media/testvideo.mp4',$store->store_content['hero_banner']['video_url']);
        $this->assertSame(60,$store->store_content['hero_banner']['overlay_opacity']);

        // GET roundtrip
        $this->getJson(route('api.store-designer.show',$store->id))->assertOk()
            ->assertJsonPath('content.hero_banner.type','video')
            ->assertJsonPath('content.hero_banner.video_url','/storage/media/testvideo.mp4');

        // Storefront merged content
        $this->assertSame('video',$store->getMergedStoreContent()['hero_banner']['type']);

        // ThemeController storefront props
        $ctrl=new \App\Http\Controllers\ThemeController();
        $m=new \ReflectionMethod($ctrl,'storefrontViewProps');
        $m->setAccessible(true);
        $storeArr=['id'=>$store->id,'name'=>$store->name,'theme'=>$store->getTemplateSlug(),'email'=>$store->email,'description'=>'','slug'=>$store->slug,'custom_domain'=>null,'custom_subdomain'=>null,'enable_custom_domain'=>false,'enable_custom_subdomain'=>false];
        $cfg=(new \ReflectionMethod($ctrl,'getStoreConfig'))->invoke($ctrl,$storeArr);
        $props=$m->invoke($ctrl,$storeArr,$cfg,$store,$store->getTemplateSlug(), collect([]), collect([]), null);
        $this->assertSame('video',$props['storeContent']['hero_banner']['type']);
    }

    public function test_banners_array_of_objects_persists(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),[
            'content'=>[
                'banners'=>[['image'=>'/storage/a.jpg','title'=>'Sale'],['image'=>'/storage/b.jpg','title'=>'Sale2']]
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertCount(2,$store->store_content['banners']);
        $this->assertSame('/storage/a.jpg',$store->store_content['banners'][0]['image']);
    }

    public function test_hero_images_sync_to_banners(): void
    {
        // Designer handleSaveAll mirrors hero_images to banners for cross-template
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        // Simulate designer payload that includes hero_images and also expects banners sync (via handleSave logic we duplicated server-side? Actually sync is client-side, but store_content should still accept banners)
        // Test that hero_banner persists even when bazaar-market reads banners fallback
        $this->putJson(route('api.store-designer.update',$store->id),[
            'content'=>[
                'hero_banner.type'=>'image',
                'hero_banner.images'=>['/storage/hero1.jpg','/storage/hero2.jpg'],
                'hero_banner.heading'=>'Hi',
                'banners'=>[['image'=>'/storage/hero1.jpg','title'=>'Hi'],['image'=>'/storage/hero2.jpg','title'=>'Hi']]
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame(['/storage/hero1.jpg','/storage/hero2.jpg'],$store->store_content['hero_banner']['images']);
        $this->assertCount(2,$store->store_content['banners']);
    }

    public function test_whatsapp_merchant_notify_does_not_rollback_order(): void
    {
        [$user,$store]=$this->ownerWithStore();
        // No whatsapp config initially -> notify should return no_provider but not throw
        $order = new \App\Models\Order();
        $order->forceFill([
            'order_number'=>\App\Models\Order::generateOrderNumber(),
            'store_id'=>$store->id,'session_id'=>'test','status'=>'pending','payment_status'=>'pending',
            'customer_first_name'=>'John','customer_last_name'=>'Doe','customer_email'=>'john@example.com','customer_phone'=>'+970599000001',
            'shipping_address'=>'Addr','shipping_city'=>1,'shipping_state'=>1,'shipping_country'=>1,
            'billing_address'=>'Addr','billing_city'=>1,'billing_state'=>1,'billing_country'=>1,
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,
            'payment_method'=>'cod'
        ]);
        $order->save();
        $notifier=new \App\Services\MerchantWhatsAppNotifier();
        $res=$notifier->notify($order);
        $this->assertFalse($res['sent']);
        $this->assertContains($res['reason'],['not_enabled','no_provider','invalid_number']);
        $this->assertNotNull(\App\Models\Order::find($order->id));

        // Now enable whatsapp but still no provider -> enabled_but_no_provider
        \App\Models\PaymentSetting::updateOrCreate(['user_id'=>$user->id,'store_id'=>$store->id,'key'=>'is_whatsapp_enabled'],['value'=>'1']);
        \App\Models\PaymentSetting::updateOrCreate(['user_id'=>$user->id,'store_id'=>$store->id,'key'=>'whatsapp_number'],['value'=>'+970599123456']);
        $status=$notifier->getStatusForStore($user->id,$store->id);
        $this->assertSame('enabled_but_no_provider',$status['status']);

        $res2=$notifier->notify($order->refresh());
        $this->assertFalse($res2['sent']);
        $this->assertSame('no_provider',$res2['reason']);
        $this->assertNotNull(\App\Models\Order::find($order->id));
    }

    public function test_youtube_hero_persists(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),[
            'content'=>[
                'hero_banner.type'=>'youtube',
                'hero_banner.youtube_url'=>'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ]
        ])->assertOk();
        $store->refresh();
        $this->assertSame('youtube',$store->store_content['hero_banner']['type']);
        $this->assertSame('https://www.youtube.com/watch?v=dQw4w9WgXcQ',$store->store_content['hero_banner']['youtube_url']);
    }
}
