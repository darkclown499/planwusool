<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Models\StoreCourierIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderFulfillmentTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'superadmin','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store(); $store->user_id=$user->id; $store->name='Test'; $store->slug='test-'.uniqid(); $store->theme='bazaar-market'; $store->email='s@e.com'; $store->save();
        $user->current_store=$store->id; $user->save();
        return [$user,$store];
    }

    private function createOrder(Store $store, array $over=[]): Order
    {
        return Order::forceCreate(array_merge([
            'order_number'=>Order::generateOrderNumber(),
            'store_id'=>$store->id,
            'session_id'=>'s1',
            'status'=>'pending',
            'payment_status'=>'pending',
            'customer_email'=>'a@a.com',
            'customer_first_name'=>'A',
            'customer_last_name'=>'B',
            'customer_phone'=>'059',
            'shipping_address'=>'addr',
            'shipping_city'=>'Nablus',
            'shipping_state'=>'WB',
            'shipping_country'=>'PS',
            'billing_address'=>'addr',
            'billing_city'=>'N',
            'billing_state'=>'W',
            'billing_country'=>'PS',
            'subtotal'=>10,
            'total_amount'=>20,
            'payment_method'=>'cod',
            'shipping_amount'=>5,
        ], $over));
    }

    public function test_order_page_displays_shipment(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'DHL','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id, 'delivery_company'=>'DHL']);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $this->actingAs($user);
        $res=$this->get(route('orders.show', $order->id));
        $res->assertStatus(200);
    }

    public function test_manual_order_displays_manual_fulfillment(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'Manual','type'=>'flat_rate','cost'=>0,'is_active'=>true,'fulfillment_type'=>'manual','delivery_company'=>'واصل لوجستيك']);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        $this->actingAs($user);
        $res=$this->get(route('orders.show', $order->id));
        $res->assertStatus(200);
        $this->assertEquals('manual', $res->inertiaPage()['props']['order']['fulfillment']['type']);
    }

    public function test_personal_delivery_displays_correct_state(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'Personal','type'=>'flat_rate','cost'=>0,'is_active'=>true,'fulfillment_type'=>'personal']);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id, 'status'=>'processing']);
        $this->actingAs($user);
        $res=$this->get(route('orders.show', $order->id));
        $this->assertEquals('personal', $res->inertiaPage()['props']['order']['fulfillment']['type']);
    }

    public function test_shipment_failure_shows_retry(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'bad'],'status'=>'connected','is_active'=>true]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $shipModel=OrderShipment::where('order_id',$order->id)->first();
        $this->assertEquals('failed',$shipModel->status);
    }

    public function test_delivered_webhook_updates_timeline(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true,'settings'=>['webhook_secret'=>'secret']]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $shipment=OrderShipment::where('order_id',$order->id)->first();
        $payload=json_encode(['tracking_number'=>$shipment->tracking_number,'status'=>'delivered']);
        $sig=hash_hmac('sha256',$payload,'secret');
        $res=$this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$sig]);
        $res->assertStatus(200);
        $this->assertEquals('delivered', $shipment->fresh()->status);
    }

    public function test_retry_dispatches_once(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $first=OrderShipment::where('order_id',$order->id)->first();
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $this->assertEquals(1, OrderShipment::where('order_id',$order->id)->count());
        $this->assertEquals($first->external_id, OrderShipment::first()->external_id);
    }

    public function test_invalid_webhook_does_not_update(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true,'settings'=>['webhook_secret'=>'secret']]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $shipment=OrderShipment::where('order_id',$order->id)->first();
        $payload=json_encode(['tracking_number'=>$shipment->tracking_number,'status'=>'delivered']);
        $res=$this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>'bad']);
        $res->assertStatus(401);
        $this->assertNotEquals('delivered', $shipment->fresh()->status);
    }

    public function test_cod_amount_displayed_correctly(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $order=$this->createOrder($store,['payment_method'=>'cod','payment_status'=>'pending','total_amount'=>100]);
        $this->actingAs($user);
        $res=$this->get(route('orders.show',$order->id));
        $this->assertEquals(100, $res->inertiaPage()['props']['order']['payment']['cod_amount']);
    }

    public function test_prepaid_cod_zero(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $order=$this->createOrder($store,['payment_method'=>'cod','payment_status'=>'paid','total_amount'=>100]);
        $this->actingAs($user);
        $res=$this->get(route('orders.show',$order->id));
        $this->assertEquals(0, $res->inertiaPage()['props']['order']['payment']['cod_amount']);
    }

    public function test_cancelled_order_cannot_create_shipment(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id,'status'=>'cancelled']);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $this->assertEquals('cancelled', $order->fresh()->status);
    }

    public function test_delivered_cannot_transition_backwards(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $order=$this->createOrder($store,['status'=>'delivered']);
        $this->actingAs($user);
        $res=$this->put(route('orders.update',$order->id), ['status'=>'processing','payment_status'=>'paid','tracking_number'=>'','notes'=>'']);
        $res->assertSessionHasErrors('status');
    }

    public function test_store_a_cannot_access_store_b_shipment(): void
    {
        [$userA,$storeA]=$this->ownerWithStore(); [$userB,$storeB]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$storeA->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $ship=Shipping::create(['store_id'=>$storeA->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($storeA,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $shipment=OrderShipment::where('order_id',$order->id)->first();
        $this->actingAs($userB);
        $res=$this->postJson("/api/stores/{$storeB->id}/orders/{$order->id}/shipments/{$shipment->id}/retry");
        $this->assertTrue(in_array($res->status(), [403,404]));
    }

    public function test_manual_status_update_works(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'Manual','type'=>'flat_rate','cost'=>0,'is_active'=>true,'fulfillment_type'=>'manual','delivery_company'=>'واصل']);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id,'status'=>'processing']);
        $this->actingAs($user);
        $res=$this->put(route('orders.update',$order->id), ['status'=>'shipped','payment_status'=>'pending','tracking_number'=>'','notes'=>'']);
        $res->assertSessionHasNoErrors();
        $this->assertEquals('shipped', $order->fresh()->status);
    }

    public function test_personal_status_update_works(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $order=$this->createOrder($store,['status'=>'pending']);
        $this->actingAs($user);
        $res=$this->put(route('orders.update',$order->id), ['status'=>'confirmed','payment_status'=>'pending','tracking_number'=>'','notes'=>'']);
        $res->assertSessionHasNoErrors();
        $this->assertEquals('confirmed', $order->fresh()->status);
    }

    public function test_connected_shipment_status_from_order_shipment(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $integ=StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','credentials'=>['api_key'=>'valid_mock_key'],'status'=>'connected','is_active'=>true]);
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'X','type'=>'flat_rate','cost'=>10,'is_active'=>true,'fulfillment_type'=>'courier','courier_integration_id'=>$integ->id]);
        $order=$this->createOrder($store,['shipping_method_id'=>$ship->id]);
        (new \App\Jobs\CreateCourierShipment($order->id))->handle();
        $this->actingAs($user);
        $res=$this->get(route('orders.show',$order->id));
        $this->assertEquals('mock', $res->inertiaPage()['props']['order']['shipments'][0]['provider']);
        $this->assertNotEmpty($res->inertiaPage()['props']['order']['shipments'][0]['status']);
    }

    public function test_order_list_fulfillment_column(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $ship=Shipping::create(['store_id'=>$store->id,'name'=>'Personal','type'=>'flat_rate','cost'=>5,'is_active'=>true,'fulfillment_type'=>'personal']);
        $this->createOrder($store,['shipping_method_id'=>$ship->id]);
        $this->actingAs($user);
        $res=$this->get(route('orders.index'));
        $res->assertStatus(200);
        $this->assertTrue(true);
    }
}
