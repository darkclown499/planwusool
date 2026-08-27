<?php

namespace Tests\Feature;

use App\Jobs\SendAbandonedCartWhatsAppNotification;
use App\Models\AbandonedCart;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreWhatsappIntegration;
use App\Models\User;
use App\Models\WhatsappMessage;
use App\Models\WhatsappWebhookEvent;
use App\Services\AbandonedCartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function companyWithStore(string $suffix = ''): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(), 'price'=>99, 'themes'=>['all'], 'max_stores'=>10, 'max_products_per_store'=>1000, 'max_users_per_store'=>20, 'enable_shipping_method'=>'on']);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id=$user->id; $store->name='S'.$suffix.' '.uniqid(); $store->slug='s-'.$suffix.'-'.uniqid(); $store->theme='bazaar-market'; $store->email='s@'.uniqid().'.com'; $store->save();
        $user->current_store=$store->id; $user->save();
        return [$user,$store];
    }

    private function integration(Store $store, array $ov=[]): StoreWhatsappIntegration {
        return StoreWhatsappIntegration::create(array_merge([
            'store_id'=>$store->id,'provider'=>'meta','access_token'=>'tok_'.uniqid(),'phone_number_id'=>'PID'.uniqid(),'waba_id'=>'WABA','business_phone'=>'+970599000000','notification_phone'=>'+970591234567','is_enabled'=>true,'connection_status'=>'connected','last_verified_at'=>now(),
        ],$ov));
    }

    private function makeOrder(Store $store, array $ov=[]): Order {
        return Order::forceCreate(array_merge([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'session_id'=>'sess-'.uniqid(),'status'=>'pending','payment_status'=>'pending','customer_email'=>'c@example.com','customer_first_name'=>'A','customer_last_name'=>'B','customer_phone'=>'0590000000','shipping_address'=>'Addr','shipping_city'=>'Nablus','shipping_state'=>'WB','shipping_country'=>'PS','billing_address'=>'Addr','billing_city'=>'Nablus','billing_state'=>'WB','billing_country'=>'PS','subtotal'=>50,'total_amount'=>50,'payment_method'=>'cod',
        ],$ov));
    }

    public function test_store_a_cannot_use_store_b_whatsapp_config(): void
    {
        [$userA,$storeA]=$this->companyWithStore('A'); [$userB,$storeB]=$this->companyWithStore('B');
        $this->integration($storeA,['phone_number_id'=>'111','notification_phone'=>'+970591111111','access_token'=>'tokA']);
        $this->integration($storeB,['phone_number_id'=>'222','notification_phone'=>'+970592222222','access_token'=>'tokB']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamidA']]],200)]);
        $orderA=$this->makeOrder($storeA);
        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($orderA);
        Http::assertSent(fn($r)=>str_contains($r->url(),'111'));
        Http::assertNotSent(fn($r)=>str_contains($r->url(),'222'));
        Http::assertSent(fn($r)=>($r->data()['to']??'')==='970591111111');
    }

    public function test_unconfigured_store_fails_safely(): void
    {
        [, $store]=$this->companyWithStore();
        Http::fake();
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('not_connected',$result['reason']);
        Http::assertNothingSent();
    }

    public function test_disabled_integration_fails_safely(): void
    {
        [, $store]=$this->companyWithStore();
        $this->integration($store,['is_enabled'=>false]);
        Http::fake();
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('not_enabled',$result['reason']);
    }

    public function test_abandoned_cart_queues_once(): void
    {
        [, $store]=$this->companyWithStore();
        $this->integration($store,['phone_number_id'=>'999','access_token'=>'tok','is_enabled'=>true,'connection_status'=>'connected']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid-cart-'.uniqid()]]],200)]);
        $cart=AbandonedCart::create([
            'store_id'=>$store->id,'session_id'=>'sess-'.uniqid(),'customer_phone'=>'0591234567','customer_email'=>'c@example.com','cart_items'=>[['name'=>'P','quantity'=>1]],'cart_total'=>99,'status'=>'abandoned','last_activity_at'=>now()->subMinutes(40),'recovery_token'=>bin2hex(random_bytes(32)),'expires_at'=>now()->addDays(7),'abandoned_at'=>now(),
        ]);
        $svc=app(AbandonedCartService::class);
        $res=$svc->sendReminder($cart);
        $this->assertTrue($res['success']);
        Http::assertSentCount(1);
        $cart->refresh();
        $this->assertNotNull($cart->whatsapp_message_id);
        $this->assertEquals('sent',$cart->whatsapp_status);
        $this->assertDatabaseHas('whatsapp_messages',['store_id'=>$store->id,'abandoned_cart_id'=>$cart->id,'status'=>'sent']);
    }

    public function test_abandoned_cart_retry_does_not_duplicate(): void
    {
        [, $store]=$this->companyWithStore();
        $this->integration($store,['phone_number_id'=>'999','access_token'=>'tok','is_enabled'=>true,'connection_status'=>'connected']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid-dup']]],200)]);
        $cart=AbandonedCart::create([
            'store_id'=>$store->id,'session_id'=>'sess-'.uniqid(),'customer_phone'=>'0591234567','customer_email'=>'c@example.com','cart_items'=>[['name'=>'P','quantity'=>1]],'cart_total'=>99,'status'=>'abandoned','last_activity_at'=>now()->subMinutes(40),'recovery_token'=>bin2hex(random_bytes(32)),'expires_at'=>now()->addDays(7),'abandoned_at'=>now(),
        ]);
        $job=new SendAbandonedCartWhatsAppNotification($cart->id);
        $job->handle();
        Http::assertSentCount(1);
        $job2=new SendAbandonedCartWhatsAppNotification($cart->id);
        $job2->handle();
        Http::assertSentCount(1);
        $this->assertEquals(1, WhatsappMessage::where('abandoned_cart_id',$cart->id)->count());
    }

    public function test_abandoned_cart_unconfigured_fails_safely_no_fake_success(): void
    {
        [, $store]=$this->companyWithStore();
        Http::fake();
        $cart=AbandonedCart::create([
            'store_id'=>$store->id,'session_id'=>'sess-'.uniqid(),'customer_phone'=>'0591234567','customer_email'=>'c@example.com','cart_items'=>[],'cart_total'=>10,'status'=>'abandoned','last_activity_at'=>now()->subMinutes(40),'recovery_token'=>bin2hex(random_bytes(32)),'expires_at'=>now()->addDays(7),'abandoned_at'=>now(),
        ]);
        $svc=app(AbandonedCartService::class);
        $res=$svc->sendReminder($cart);
        Http::assertNothingSent();
        $cart->refresh();
        $this->assertNotEquals('sent',$cart->whatsapp_status);
    }

    public function test_webhook_verification_works(): void
    {
        config(['services.whatsapp.verify_token'=>'my_verify_123']);
        $resp=$this->get('/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=my_verify_123&hub.challenge=CHALLENGE123');
        $resp->assertStatus(200)->assertSee('CHALLENGE123', false);
    }

    public function test_invalid_verification_rejected(): void
    {
        config(['services.whatsapp.verify_token'=>'secret']);
        $resp=$this->get('/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CHALLENGE');
        $resp->assertStatus(403);
    }

    public function test_malformed_webhook_rejected(): void
    {
        $resp=$this->postJson('/webhook/whatsapp', ['garbage'=>'yes']);
        $resp->assertStatus(400);
    }

    public function test_duplicate_webhook_event_processed_once(): void
    {
        [, $store]=$this->companyWithStore();
        $int=$this->integration($store,['phone_number_id'=>'PID999','access_token'=>'tok']);
        $order=$this->makeOrder($store);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid-dup-status']]],200)]);
        $notifier=app(\App\Services\MerchantWhatsAppNotifier::class);
        $notifier->notify($order);
        $payload=[
            'object'=>'whatsapp_business_account',
            'entry'=>[[
                'id'=>'entry1','changes'=>[[
                    'field'=>'messages',
                    'value'=>[
                        'messaging_product'=>'whatsapp',
                        'metadata'=>['display_phone_number'=>'+970599000000','phone_number_id'=>'PID999'],
                        'statuses'=>[['id'=>'wamid-dup-status','status'=>'delivered','timestamp'=>time(),'recipient_id'=>'970591234567']]
                    ]
                ]]
            ]]
        ];
        $this->postJson('/webhook/whatsapp',$payload)->assertStatus(200);
        $this->postJson('/webhook/whatsapp',$payload)->assertStatus(200);
        $this->assertEquals(1, WhatsappWebhookEvent::where('event_id','wamid-dup-status:delivered')->count());
        $this->assertEquals('delivered', WhatsappMessage::where('order_id',$order->id)->first()->status);
    }

    public function test_delivery_status_updates_correct_message_only(): void
    {
        [, $store]=$this->companyWithStore();
        $int=$this->integration($store,['phone_number_id'=>'PID111']);
        $order1=$this->makeOrder($store); $order2=$this->makeOrder($store);
        WhatsappMessage::create(['store_id'=>$store->id,'order_id'=>$order1->id,'recipient_phone'=>'+970591111111','provider'=>'meta','provider_message_id'=>'wamid-1','direction'=>'outbound','message_type'=>'order_notification','status'=>'sent','sent_at'=>now()]);
        WhatsappMessage::create(['store_id'=>$store->id,'order_id'=>$order2->id,'recipient_phone'=>'+970591111111','provider'=>'meta','provider_message_id'=>'wamid-2','direction'=>'outbound','message_type'=>'order_notification','status'=>'sent','sent_at'=>now()]);
        $payload=[
            'object'=>'whatsapp_business_account',
            'entry'=>[[
                'changes'=>[[
                    'field'=>'messages',
                    'value'=>[
                        'metadata'=>['phone_number_id'=>'PID111','display_phone_number'=>'+970599000000'],
                        'statuses'=>[['id'=>'wamid-1','status'=>'delivered','timestamp'=>time()]]
                    ]
                ]]
            ]]
        ];
        $this->postJson('/webhook/whatsapp',$payload)->assertStatus(200);
        $this->assertEquals('delivered', WhatsappMessage::where('provider_message_id','wamid-1')->first()->status);
        $this->assertEquals('sent', WhatsappMessage::where('provider_message_id','wamid-2')->first()->status);
    }

    public function test_foreign_store_payload_cannot_mutate_another_store(): void
    {
        [, $storeA]=$this->companyWithStore('A'); [, $storeB]=$this->companyWithStore('B');
        $intA=$this->integration($storeA,['phone_number_id'=>'PID_A']);
        $intB=$this->integration($storeB,['phone_number_id'=>'PID_B']);
        $orderA=$this->makeOrder($storeA);
        WhatsappMessage::create(['store_id'=>$storeA->id,'order_id'=>$orderA->id,'recipient_phone'=>'+970591111111','provider'=>'meta','provider_message_id'=>'wamid-cross','direction'=>'outbound','message_type'=>'order_notification','status'=>'sent','sent_at'=>now()]);
        $payload=[
            'object'=>'whatsapp_business_account',
            'entry'=>[[
                'changes'=>[[
                    'field'=>'messages',
                    'value'=>[
                        'metadata'=>['phone_number_id'=>'PID_B','display_phone_number'=>'+970599000000'],
                        'statuses'=>[['id'=>'wamid-cross','status'=>'failed','timestamp'=>time()]]
                    ]
                ]]
            ]]
        ];
        $this->postJson('/webhook/whatsapp',$payload)->assertStatus(200);
        $this->assertEquals('sent', WhatsappMessage::where('provider_message_id','wamid-cross')->first()->status);
        $this->assertEquals(1, WhatsappWebhookEvent::where('store_id',$storeB->id)->count());
    }

    public function test_existing_merchant_order_whatsapp_regression(): void
    {
        [, $store]=$this->companyWithStore();
        $this->integration($store,['phone_number_id'=>'PIDREG','notification_phone'=>'+970591234567','access_token'=>'tok','is_enabled'=>true,'connection_status'=>'connected']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid-reg']]],200)]);
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertTrue($result['sent']);
        $this->assertDatabaseHas('whatsapp_messages',['store_id'=>$store->id,'order_id'=>$order->id,'status'=>'sent','provider_message_id'=>'wamid-reg']);
    }

    public function test_cross_store_abandoned_cart_isolation(): void
    {
        [, $storeA]=$this->companyWithStore('A'); [, $storeB]=$this->companyWithStore('B');
        $this->integration($storeA,['phone_number_id'=>'PID_A','access_token'=>'tokA','notification_phone'=>'+970591111111','is_enabled'=>true,'connection_status'=>'connected']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $cart=AbandonedCart::create([
            'store_id'=>$storeB->id,'session_id'=>'sess-'.uniqid(),'customer_phone'=>'0591234567','customer_email'=>'c@example.com','cart_items'=>[],'cart_total'=>20,'status'=>'abandoned','last_activity_at'=>now()->subMinutes(40),'recovery_token'=>bin2hex(random_bytes(32)),'expires_at'=>now()->addDays(7),'abandoned_at'=>now(),
        ]);
        $job=new SendAbandonedCartWhatsAppNotification($cart->id);
        $job->handle();
        Http::assertNothingSent();
        $this->assertDatabaseMissing('whatsapp_messages',['abandoned_cart_id'=>$cart->id]);
    }
}
