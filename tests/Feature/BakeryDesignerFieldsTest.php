<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BakeryDesignerFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id=$user->id;
        $store->name=$attrs['name']??'Bakery Test';
        $store->slug=$attrs['slug']??'bakery-'.uniqid();
        $store->theme=$attrs['theme']??'bakery-house';
        $store->email='b@test.com';
        $store->save();
        $user->current_store=$store->id;
        $user->save();
        return [$user,$store];
    }

    public function test_bakery_story_fields_persist(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),['content'=>['bakery_story.enabled'=>true,'bakery_story.quote'=>'«اختبار القصة»','bakery_story.subtitle'=>'نص مساعد']])->assertOk();
        $store->refresh();
        $this->assertTrue($store->store_content['bakery_story']['enabled']===true);
        $this->assertSame('«اختبار القصة»',$store->store_content['bakery_story']['quote']);
        $this->assertSame('نص مساعد',$store->store_content['bakery_story']['subtitle']);
        // reload via GET
        $res=$this->getJson(route('api.store-designer.show',$store->id))->assertOk();
        $this->assertSame('«اختبار القصة»', data_get($res->json(),'content.bakery_story.quote'));
    }

    public function test_bakery_story_off_hides(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),['content'=>['bakery_story.enabled'=>false,'bakery_story.quote'=>'hide me']])->assertOk();
        $store->refresh();
        $this->assertFalse($store->store_content['bakery_story']['enabled']);
        // verify ThemeController merged content keeps enabled false
        $merged=$store->getMergedStoreContent();
        $this->assertFalse($merged['bakery_story']['enabled'] ?? true);
    }

    public function test_bakery_last_batch_fields_persist(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),['content'=>['bakery_last_batch.enabled'=>true,'bakery_last_batch.hour'=>20]])->assertOk();
        $store->refresh();
        $this->assertTrue($store->store_content['bakery_last_batch']['enabled']===true);
        $this->assertSame(20,(int)$store->store_content['bakery_last_batch']['hour']);
    }

    public function test_bakery_last_batch_off_hides(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),['content'=>['bakery_last_batch.enabled'=>false]])->assertOk();
        $store->refresh();
        $this->assertFalse($store->store_content['bakery_last_batch']['enabled']);
    }

    public function test_switching_away_preserves_bakery_config(): void
    {
        [$user,$store]=$this->ownerWithStore(['theme'=>'bakery-house']);
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update',$store->id),['content'=>['bakery_story.quote'=>'keep','bakery_last_batch.hour'=>19]])->assertOk();
        $this->putJson(route('api.store-designer.update',$store->id),['theme'=>'bazaar-market'])->assertOk();
        $store->refresh();
        $this->assertSame('keep',$store->store_content['bakery_story']['quote']);
        $this->assertSame(19,(int)$store->store_content['bakery_last_batch']['hour']);
        $this->putJson(route('api.store-designer.update',$store->id),['theme'=>'bakery-house'])->assertOk();
        $store->refresh();
        $this->assertSame('keep',$store->store_content['bakery_story']['quote']);
    }

    public function test_other_templates_do_not_require_bakery_fields(): void
    {
        [$user,$store]=$this->ownerWithStore(['theme'=>'bazaar-market']);
        $this->actingAs($user);
        $res=$this->getJson(route('api.store-designer.show',$store->id))->assertOk();
        // content may not have bakery_story, but API should not error — just empty/missing
        $this->assertTrue(true);
    }
}
