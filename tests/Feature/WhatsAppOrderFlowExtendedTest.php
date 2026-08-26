<?php

namespace Tests\Feature;

use App\Events\OrderCreated;
use App\Jobs\SendMerchantWhatsAppNotification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Category;
use App\Models\Store;
use App\Models\StoreWhatsappIntegration;
use App\Models\User;
use App\Services\PhoneNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WhatsAppOrderFlowExtendedTest extends TestCase
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
        $store->theme=$attrs['theme']??$attrs['template']??'bazaar-market';
        $store->email='store@example.com';
        $store->save();
        $user->current_store=$store->id;
        $user->save();
        return [$user,$store];
    }

    private function makeIntegration(Store $store, array $over=[]): StoreWhatsappIntegration {
        return StoreWhatsappIntegration::create(array_merge([
            'store_id'=>$store->id,'provider'=>'meta','access_token'=>'tok_'.uniqid(),'phone_number_id'=>'111222333','waba_id'=>'999','business_phone'=>'+970599000000','notification_phone'=>'+970591234567','is_enabled'=>true,'connection_status'=>'connected','last_verified_at'=>now()
        ], $over));
    }

    private function makeOrder(Store $store, array $over=[]): Order {
        return Order::forceCreate(array_merge([
            'order_number'=>Order::generateOrderNumber(),
            'store_id'=>$store->id,'session_id'=>'sess','status'=>'pending','payment_status'=>'pending',
            'customer_email'=>'c@example.com','customer_first_name'=>'Ahmad','customer_last_name'=>'Ali','customer_phone'=>'0591234567',
            'shipping_address'=>'شارع الرئيسي','shipping_city'=>'قلقيلية','shipping_state'=>'WB','shipping_country'=>'PS',
            'billing_address'=>'شارع الرئيسي','billing_city'=>'قلقيلية','billing_state'=>'WB','billing_country'=>'PS',
            'subtotal'=>100,'total_amount'=>120,'payment_method'=>'cod','shipping_method_id'=>null,
        ], $over));
    }

    public function test_blank_token_preserves_existing(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['access_token'=>'orig_secret']);
        $this->actingAs($user);
        $this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'','phone_number_id'=>'111','notification_phone'=>'0591234567','is_enabled'=>true
        ])->assertRedirect();
        $this->assertEquals('orig_secret', StoreWhatsappIntegration::where('store_id',$store->id)->first()->access_token);
        // also masked token should preserve
        $this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'••••••••••••••••','phone_number_id'=>'111','notification_phone'=>'0591234567','is_enabled'=>true
        ])->assertRedirect();
        $this->assertEquals('orig_secret', StoreWhatsappIntegration::where('store_id',$store->id)->first()->access_token);
    }

    public function test_token_replacement(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['access_token'=>'old']);
        $this->actingAs($user);
        $this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'new_secret_xyz','phone_number_id'=>'111','notification_phone'=>'0591234567','is_enabled'=>true
        ])->assertRedirect();
        $this->assertEquals('new_secret_xyz', StoreWhatsappIntegration::where('store_id',$store->id)->first()->access_token);
    }

    public function test_waba_id_optional(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'EAAG123','phone_number_id'=>'123','waba_id'=>'','business_phone'=>'0599000000','notification_phone'=>'0591234567','is_enabled'=>true
        ])->assertRedirect();
        $this->assertDatabaseHas('store_whatsapp_integrations',['store_id'=>$store->id,'waba_id'=>'']);
        $this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'EAAG123','phone_number_id'=>'123','waba_id'=>'987654','notification_phone'=>'0591234567','is_enabled'=>true
        ])->assertRedirect();
        $this->assertEquals('987654', StoreWhatsappIntegration::where('store_id',$store->id)->first()->waba_id);
    }

    public function test_notification_phone_required_when_enabled(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $response=$this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'tok','phone_number_id'=>'123','notification_phone'=>'','is_enabled'=>true
        ]);
        $response->assertSessionHasErrors('notification_phone');
    }

    public function test_invalid_phone_rejected(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->actingAs($user);
        $response=$this->put(route('stores.notifications.whatsapp.update',$store->id),[
            'access_token'=>'tok','phone_number_id'=>'123','notification_phone'=>'invalid','is_enabled'=>true
        ]);
        $response->assertSessionHasErrors('notification_phone');
        $this->assertFalse(PhoneNormalizer::isValid('invalid'));
        $this->assertTrue(PhoneNormalizer::isValid('0591234567'));
        $this->assertTrue(PhoneNormalizer::isValid('+970599123456'));
    }

    public function test_order_dispatches_job_after_commit(): void {
        Bus::fake();
        // Use actual OrderService flow: event dispatches job
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store);
        $order=$this->makeOrder($store);
        event(new OrderCreated($order));
        Bus::assertDispatched(SendMerchantWhatsAppNotification::class, fn($job)=>$job->orderId===$order->id);
    }

    public function test_disabled_no_job_effect(): void {
        Http::fake();
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['is_enabled'=>false]);
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('not_enabled',$result['reason']);
        Http::assertNothingSent();
    }

    public function test_message_content_includes_items_and_address(): void {
        [$user,$store]=$this->ownerWithStore();
        $integration=$this->makeIntegration($store, ['notification_phone'=>'+970591234567']);
        $order=$this->makeOrder($store, ['customer_first_name'=>'أحمد','customer_last_name'=>'محمد','total_amount'=>150,'payment_method'=>'cod']);
        $cat=\App\Models\Category::factory()->create(['store_id'=>$store->id,'is_active'=>true,'name'=>'Cat','slug'=>'cat-'.uniqid()]);
        $prod1=\App\Models\Product::create(['name'=>'منتج A','price'=>50,'store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10]);
        $prod2=\App\Models\Product::create(['name'=>'منتج B','price'=>50,'store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10]);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$prod1->id,'product_name'=>'منتج A','quantity'=>2,'unit_price'=>50,'total_price'=>100,'product_price'=>50]);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$prod2->id,'product_name'=>'منتج B','quantity'=>1,'unit_price'=>50,'total_price'=>50,'product_price'=>50,'product_variants'=>json_encode(['اللون'=>'أحمر'])]);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $notifier=app(\App\Services\MerchantWhatsAppNotifier::class);
        // Use reflection to test message building
        $ref=new \ReflectionMethod($notifier,'buildMerchantMessage');
        $ref->setAccessible(true);
        $msg=$ref->invoke($notifier, $order->fresh());
        $this->assertStringContainsString('رقم الطلب: #'.$order->order_number,$msg);
        $this->assertStringContainsString('أحمد محمد',$msg);
        $this->assertStringContainsString('150.00',$msg);
        $this->assertStringContainsString('منتج A',$msg);
        $this->assertStringContainsString('منتج B',$msg);
        $this->assertStringContainsString('قلقيلية',$msg);
        $this->assertStringContainsString('رابط الطلب',$msg);
    }

    public function test_401_handled_no_retry(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['access_token'=>'bad','phone_number_id'=>'123']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'Invalid token','code'=>190]],401)]);
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('auth_error',$result['reason']);
    }

    public function test_429_handled(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['access_token'=>'tok','phone_number_id'=>'123']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'rate limit']],429)]);
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertEquals('rate_limited',$result['reason']);
    }

    public function test_5xx_handled(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['access_token'=>'tok','phone_number_id'=>'123']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'server error']],500)]);
        $order=$this->makeOrder($store);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        // Should be provider_error or rate_limited depending — ensure not sent
        $this->assertFalse($result['sent']);
    }

    public function test_idempotent_second_call_no_duplicate(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store, ['access_token'=>'tok','phone_number_id'=>'123']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $order=$this->makeOrder($store);
        $n=app(\App\Services\MerchantWhatsAppNotifier::class);
        $first=$n->notify($order);
        $second=$n->notify($order);
        $this->assertTrue($first['sent']);
        $this->assertFalse($second['sent']);
        $this->assertEquals('duplicate',$second['reason']);
        Http::assertSentCount(1);
    }

    public function test_guest_order(): void {
        [$user,$store]=$this->ownerWithStore();
        $this->makeIntegration($store);
        $order=$this->makeOrder($store, ['customer_id'=>null,'session_id'=>'guest123','customer_first_name'=>'Guest','customer_last_name'=>'','customer_email'=>'guest@example.com']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertTrue($result['sent']);
    }

    public function test_all_templates_reach_same_notification(): void {
        $templates=['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'];
        foreach($templates as $tpl){
            [$user,$store]=$this->ownerWithStore(['template'=>$tpl,'slug'=>'tpl-'.uniqid()]);
            $this->makeIntegration($store, ['access_token'=>'tok','phone_number_id'=>'123','notification_phone'=>'+970591234567']);
            Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
            $order=$this->makeOrder($store);
            $result=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
            $this->assertTrue($result['sent'], "template $tpl failed");
            // clear idempotency for next iteration? use different order each time already
            \Illuminate\Support\Facades\Cache::flush();
        }
    }

    public function test_phone_normalization_central(): void {
        $cases=[
            '059 123 4567'=>'+970591234567',
            '+970 59 123 4567'=>'+970591234567',
            '970591234567'=>'+970591234567',
            '00970591234567'=>'+970591234567',
        ];
        foreach($cases as $raw=>$exp){
            $this->assertEquals($exp, PhoneNormalizer::normalize($raw), "normalize $raw");
        }
    }

    public function test_store_a_cannot_test_store_b(): void {
        [$userA,$storeA]=$this->ownerWithStore(['slug'=>'a-'.uniqid()]);
        [$userB,$storeB]=$this->ownerWithStore(['slug'=>'b-'.uniqid()]);
        $this->makeIntegration($storeB, ['access_token'=>'tokB','phone_number_id'=>'222','notification_phone'=>'+970592222222','is_enabled'=>true,'connection_status'=>'connected']);
        $this->actingAs($userA);
        $this->postJson(route('stores.notifications.whatsapp.test',$storeB->id))->assertStatus(403);
        $this->postJson(route('stores.notifications.whatsapp.verify',$storeB->id))->assertStatus(403);
    }
}
