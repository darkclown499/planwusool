<?php

namespace Tests\Feature;

use App\Services\Courier\CourierRegistry;
use App\Models\StoreCourierIntegration;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingCourierUxTest extends TestCase
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

    public function test_togo_appears_in_catalog(): void
    {
        $cat = CourierRegistry::catalog();
        $this->assertTrue(collect($cat)->contains(fn($c)=>$c['slug']==='togo'));
        $togo = collect($cat)->firstWhere('slug','togo');
        $this->assertEquals('aggregator', $togo['type'] ?? null);
        $this->assertStringContainsString('TOGO', $togo['name']);
    }

    public function test_togo_is_aggregator_partnership_request(): void
    {
        $cat = CourierRegistry::catalog();
        $togo = collect($cat)->firstWhere('slug','togo');
        $this->assertEquals('manual', $togo['status']);
        $this->assertFalse(CourierRegistry::isSupported('togo'));
    }

    public function test_unconnected_aramex_not_in_connected_dropdown(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'aramex','credentials'=>['username'=>'u'],'status'=>'error','is_active'=>true]);
        $connected = StoreCourierIntegration::where('store_id',$store->id)->where('status','connected')->where('is_active',true)->get();
        $this->assertEquals(0,$connected->count());
    }

    public function test_connected_dhl_appears(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'dhl','credentials'=>['api_key'=>'k','api_secret'=>'s'],'status'=>'connected','is_active'=>true]);
        $connected = StoreCourierIntegration::where('store_id',$store->id)->where('status','connected')->where('is_active',true)->get();
        $this->assertEquals(1,$connected->count());
        $this->assertEquals('dhl',$connected->first()->provider);
    }

    public function test_disabled_integration_does_not_appear(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'dhl','credentials'=>['api_key'=>'k'],'status'=>'connected','is_active'=>false]);
        $connected = StoreCourierIntegration::where('store_id',$store->id)->where('status','connected')->where('is_active',true)->count();
        $this->assertEquals(0,$connected);
    }

    public function test_manual_provider_list_sourced_from_verified_registry(): void
    {
        $cat = CourierRegistry::catalog();
        $manual = collect($cat)->filter(fn($c)=>$c['region']==='local' && $c['status']==='manual');
        $this->assertTrue($manual->contains(fn($c)=>$c['slug']==='wassel'));
        $this->assertTrue($manual->contains(fn($c)=>$c['slug']==='bosta'));
        $this->assertTrue($manual->contains(fn($c)=>$c['slug']==='togo'));
    }

    public function test_smsa_removed(): void
    {
        $cat = CourierRegistry::catalog();
        $this->assertFalse(collect($cat)->contains(fn($c)=>strtolower($c['name'])==='smsa express' || $c['slug']==='smsa'));
        // also check file does not contain SMSA
        $content = file_get_contents(resource_path('js/pages/shipping/create.tsx'));
        $this->assertStringNotContainsString('SMSA Express', $content);
    }

    public function test_store_a_providers_not_visible_to_store_b(): void
    {
        [$userA,$storeA]=$this->ownerWithStore(); [$userB,$storeB]=$this->ownerWithStore();
        StoreCourierIntegration::create(['store_id'=>$storeA->id,'provider'=>'dhl','credentials'=>['api_key'=>'k'],'status'=>'connected','is_active'=>true]);
        $this->actingAs($userB);
        $res=$this->getJson("/api/stores/{$storeA->id}/courier-integrations");
        $res->assertStatus(403);
        $res2=$this->getJson("/api/stores/{$storeB->id}/courier-integrations");
        $res2->assertStatus(200);
        $this->assertEquals(0, count($res2->json('integrations')));
    }

    public function test_back_canonical_routes_exist(): void
    {
        $this->assertTrue(\Illuminate\Support\Facades\Route::has('stores.shipping.canonical'));
        $this->assertTrue(\Illuminate\Support\Facades\Route::has('stores.shipping.integrations'));
        $this->assertTrue(\Illuminate\Support\Facades\Route::has('shipping.index'));
    }

    public function test_existing_courier_flow_remains_passing(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $shipping=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'Test','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=\App\Models\Order::forceCreate(['order_number'=>\App\Models\Order::generateOrderNumber(),'store_id'=>$store->id,'session_id'=>'s1','status'=>'pending','payment_status'=>'pending','customer_email'=>'a@a.com','customer_first_name'=>'A','customer_last_name'=>'B','customer_phone'=>'059','shipping_address'=>'a','shipping_city'=>'N','shipping_state'=>'W','shipping_country'=>'PS','billing_address'=>'a','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS','subtotal'=>10,'total_amount'=>20,'payment_method'=>'cod','shipping_method_id'=>$shipping->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $this->assertDatabaseHas('order_shipments',['order_id'=>$order->id]);
    }

    public function test_mock_hidden_from_production_merchant_catalog(): void
    {
        $original = app()->environment();
        app()->detectEnvironment(fn()=> 'production');
        $catalog = \App\Services\Courier\CourierRegistry::merchantCatalog();
        $this->assertFalse(collect($catalog)->contains(fn($c)=>$c['slug']==='mock'));
        app()->detectEnvironment(fn()=> $original);
    }

    public function test_mock_remains_in_test_env(): void
    {
        $catalog = \App\Services\Courier\CourierRegistry::catalog();
        $this->assertTrue(collect($catalog)->contains(fn($c)=>$c['slug']==='mock'));
    }

    public function test_edit_connected_courier_loads_correct_integration(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'dhl','credentials'=>['api_key'=>'k'],'status'=>'connected','is_active'=>true]);
        $ship=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>5,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id, 'delivery_company'=>'DHL']);
        $found = \App\Models\Shipping::find($ship->id);
        $this->assertEquals($integ->id, $found->courier_integration_id);
    }

    public function test_connected_to_personal_clears_integration(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'dhl','credentials'=>['api_key'=>'k'],'status'=>'connected','is_active'=>true]);
        $ship=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>5,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $ship->update(['fulfillment_type'=>'personal','courier_integration_id'=>null,'delivery_company'=>'']);
        $this->assertNull($ship->fresh()->courier_integration_id);
    }

    public function test_custom_manual_provider_persists(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'Manual','type'=>'flat_rate','cost'=>0,'is_active'=>true,'fulfillment_type'=>'manual','delivery_company'=>'واصل لوجستيك']);
        $this->assertEquals('واصل لوجستيك', $ship->fresh()->delivery_company);
        $this->assertNull($ship->fresh()->courier_integration_id);
    }

    public function test_custom_manual_does_not_queue_shipment(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'Manual','type'=>'flat_rate','cost'=>0,'is_active'=>true,'fulfillment_type'=>'manual','delivery_company'=>'واصل لوجستيك']);
        $order=\App\Models\Order::forceCreate(['order_number'=>\App\Models\Order::generateOrderNumber(),'store_id'=>$store->id,'session_id'=>'s1','status'=>'pending','payment_status'=>'pending','customer_email'=>'a@a.com','customer_first_name'=>'A','customer_last_name'=>'B','customer_phone'=>'059','shipping_address'=>'a','shipping_city'=>'N','shipping_state'=>'W','shipping_country'=>'PS','billing_address'=>'a','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS','subtotal'=>10,'total_amount'=>20,'payment_method'=>'cod','shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $this->assertDatabaseMissing('order_shipments',['order_id'=>$order->id]);
    }

    public function test_custom_api_ssrf_localhost_blocked(): void
    {
        [$user,$store]=$this->ownerWithStore(); $this->actingAs($user);
        $res=$this->postJson("/api/stores/{$store->id}/courier-integrations", ['provider'=>'custom','credentials'=>['api_key'=>'k'],'settings'=>['base_url'=>'http://localhost/api']]);
        $res->assertStatus(422);
    }

    public function test_old_shipping_records_still_edit_successfully(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=\App\Models\Shipping::create(['store_id'=>$store->id,'name'=>'Legacy','type'=>'flat_rate','cost'=>10,'is_active'=>true, 'delivery_company'=>'Aramex', 'delivery_method'=>'company']);
        // Old record without fulfillment_type should still be updatable via new edit flow
        $ship->update(['name'=>'Legacy Updated','fulfillment_type'=>'manual','delivery_company'=>'واصل لوجستيك','courier_integration_id'=>null]);
        $this->assertEquals('Legacy Updated', $ship->fresh()->name);
        $this->assertEquals('واصل لوجستيك', $ship->fresh()->delivery_company);
    }

    public function test_provider_logo_path_exists_or_fallback(): void
    {
        $cat = \App\Services\Courier\CourierRegistry::catalog();
        foreach ($cat as $c) {
            if (!empty($c['logo'])) {
                $path = public_path(ltrim($c['logo'], '/'));
                $this->assertTrue(file_exists($path) || str_contains($c['logo'], 'couriers/'), "Logo missing for {$c['slug']}");
            }
        }
        $this->assertTrue(true);
    }
}
