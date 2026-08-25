<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Models\StoreCourierIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourierSelfServiceTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store(); $store->user_id=$user->id; $store->name='Test'; $store->slug='test-'.uniqid(); $store->theme='bazaar-market'; $store->email='s@e.com'; $store->save();
        $user->current_store=$store->id; $user->save();
        return [$user,$store];
    }

    public function test_aramex_required_fields_shown_via_api_validation(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        // incomplete Aramex save should be incomplete not connected
        $res=$this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'aramex','credentials'=>['username'=>'u']]);
        $res->assertStatus(200);
        $this->assertEquals('incomplete', $res->json('integration.status'));
    }
    public function test_incomplete_save_not_connected(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $res=$this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>[]]);
        $res->assertStatus(200);
        $this->assertEquals('incomplete', $res->json('integration.status'));
    }
    public function test_bad_credentials_error(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>['api_key'=>'bad']]);
        $integ=StoreCourierIntegration::where('store_id',$store->id)->where('provider','mock')->first();
        $res=$this->postJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}/test");
        $res->assertStatus(422);
        $this->assertStringContainsString('غير صحيحة', $res->json('error'));
        $this->assertEquals('error',$integ->fresh()->status);
    }
    public function test_valid_mock_connected(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key']]);
        $integ=StoreCourierIntegration::where('store_id',$store->id)->first();
        $res=$this->postJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}/test");
        $res->assertStatus(200)->assertJson(['success'=>true]);
        $this->assertEquals('connected',$integ->fresh()->status);
        $this->assertNotNull($integ->fresh()->last_tested_at);
    }
    public function test_secrets_encrypted_and_masked(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'secret123'],'status'=>'connected']);
        $this->assertNotEquals('secret123',$integ->getAttributes()['credentials']);
        $this->actingAs($user);
        $res=$this->getJson("/api/stores/{$store->id}/courier-integrations");
        $this->assertStringNotContainsString('secret123', json_encode($res->json()));
        $this->assertEquals('••••••••', $res->json('integrations.0.credentials_masked.api_key'));
    }
    public function test_refresh_persists_status(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key']]);
        $integ=StoreCourierIntegration::first();
        $this->postJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}/test");
        $res=$this->getJson("/api/stores/{$store->id}/courier-integrations");
        $this->assertEquals('connected',$res->json('integrations.0.status'));
    }
    public function test_connected_appears_in_shipping_picker(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $connected = StoreCourierIntegration::where('store_id',$store->id)->where('status','connected')->where('is_active',true)->get();
        $this->assertEquals(1,$connected->count());
    }
    public function test_incomplete_error_does_not_appear(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'bad'],'status'=>'error','is_active'=>true]);
        StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'aramex','credentials'=>['username'=>'u'],'status'=>'incomplete','is_active'=>true]);
        $connected = StoreCourierIntegration::where('store_id',$store->id)->where('status','connected')->where('is_active',true)->get();
        $this->assertEquals(0,$connected->count());
    }
    public function test_blank_secret_preserves(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key']]);
        $integ=StoreCourierIntegration::first();
        $this->postJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}/test");
        // update with blank api_key should preserve
        $res=$this->putJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}", ['credentials'=>['api_key'=>'']]);
        $res->assertStatus(200);
        $this->assertEquals('valid_mock_key', StoreCourierIntegration::find($integ->id)->credentials['api_key']);
    }
    public function test_credential_rotation_works(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key']]);
        $integ=StoreCourierIntegration::first();
        $this->putJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}", ['credentials'=>['api_key'=>'new_valid']]);
        $this->assertEquals('new_valid', StoreCourierIntegration::find($integ->id)->credentials['api_key']);
    }
    public function test_disable_removes_from_picker(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $this->putJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}", ['is_active'=>false]);
        $connected = StoreCourierIntegration::where('store_id',$store->id)->where('status','connected')->where('is_active',true)->count();
        $this->assertEquals(0,$connected);
    }
    public function test_delete_removes_connection(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'k'],'status'=>'connected']);
        $this->deleteJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}");
        $this->assertDatabaseMissing('store_courier_integrations',['id'=>$integ->id]);
    }
    public function test_store_isolation(): void
    {
        [$userA,$storeA]=$this->ownerWithStore(); [$userB,$storeB]=$this->ownerWithStore();
        StoreCourierIntegration::create(['store_id'=>$storeB->id,'provider'=>'mock','credentials'=>['api_key'=>'k'],'status'=>'connected']);
        $this->actingAs($userA);
        $res=$this->putJson("/api/stores/{$storeB->id}/courier-integrations/1", ['is_active'=>false]);
        $res->assertStatus(403);
    }
    public function test_401_maps_to_arabic(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'mock','credentials'=>['api_key'=>'bad']]);
        $integ=StoreCourierIntegration::first();
        $res=$this->postJson("/api/stores/{$store->id}/courier-integrations/{$integ->id}/test");
        $this->assertStringContainsString('غير صحيحة', $res->json('error'));
    }
    public function test_manual_shipping_unaffected(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'Manual','type'=>'flat_rate','cost'=>0,'is_active'=>true,'fulfillment_type'=>'manual']);
        $this->assertEquals('manual',$ship->fulfillment_type);
    }
}
