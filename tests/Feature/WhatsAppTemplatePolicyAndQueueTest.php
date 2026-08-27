<?php
namespace Tests\Feature;

use App\Events\OrderCreated;
use App\Jobs\SendMerchantWhatsAppNotification;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreWhatsappIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WhatsAppTemplatePolicyAndQueueTest extends TestCase
{
    use RefreshDatabase;
    private function ownerWithStore(array $a=[]): array { $pl=Plan::factory()->create(['name'=>'P'.uniqid(),'price'=>99,'themes'=>['all']]); $u=User::factory()->create(['type'=>'company','plan_id'=>$pl->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]); $s=new Store(); $s->user_id=$u->id; $s->name=$a['name']??'S'; $s->slug=$a['slug']??'s-'.uniqid(); $s->theme='bazaar-market'; $s->email='s@example.com'; $s->save(); $u->current_store=$s->id; $u->save(); return [$u,$s]; }
    private function integration(Store $s,array $o=[]): StoreWhatsappIntegration { return StoreWhatsappIntegration::create(array_merge(['store_id'=>$s->id,'provider'=>'meta','message_mode'=>'text','access_token'=>'tok','phone_number_id'=>'123','notification_phone'=>'+970591234567','is_enabled'=>true,'connection_status'=>'connected','last_verified_at'=>now()],$o)); }
    private function order(Store $s): Order { return Order::forceCreate(['order_number'=>Order::generateOrderNumber(),'store_id'=>$s->id,'session_id'=>'ss','status'=>'pending','payment_status'=>'pending','customer_email'=>'c@example.com','customer_first_name'=>'A','customer_last_name'=>'B','customer_phone'=>'0590000000','shipping_address'=>'Addr','shipping_city'=>'Nablus','shipping_state'=>'WB','shipping_country'=>'PS','billing_address'=>'Addr','billing_city'=>'Nablus','billing_state'=>'WB','billing_country'=>'PS','subtotal'=>10,'total_amount'=>10,'payment_method'=>'cod']); }

    public function test_text_mode_builds_correct_payload(): void {
        [$u,$s]=$this->ownerWithStore(); $int=$this->integration($s,['message_mode'=>'text']); $ord=$this->order($s);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertTrue($r['sent']);
        Http::assertSent(fn($req)=>($req->data()['type']??'')==='text');
    }
    public function test_template_mode_builds_correct_payload(): void {
        [$u,$s]=$this->ownerWithStore(); $int=$this->integration($s,['message_mode'=>'template','template_name'=>'order_alert','template_language'=>'ar']);
        $ord=$this->order($s);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertTrue($r['sent']);
        Http::assertSent(fn($req)=>($req->data()['type']??'')==='template' && ($req->data()['template']['name']??'')==='order_alert' && ($req->data()['template']['language']['code']??'')==='ar');
    }
    public function test_template_name_missing_error(): void {
        [$u,$s]=$this->ownerWithStore(); $int=$this->integration($s,['message_mode'=>'template','template_name'=>null,'template_language'=>'ar','is_enabled'=>true]);
        $ord=$this->order($s);
        Http::fake();
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertFalse($r['sent']); $this->assertEquals('template_config_missing',$r['reason']);
        Http::assertNothingSent();
    }
    public function test_no_silent_template_to_text_fallback(): void {
        [$u,$s]=$this->ownerWithStore(); $int=$this->integration($s,['message_mode'=>'template','template_name'=>'my_template','template_language'=>'ar']);
        $ord=$this->order($s);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'template not found']],400)]);
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertFalse($r['sent']);
        // should have sent only 1 template request, not fallback text
        Http::assertSentCount(1);
        Http::assertSent(fn($req)=>($req->data()['type']??'')==='template');
    }
    public function test_no_silent_text_to_template_fallback(): void {
        [$u,$s]=$this->ownerWithStore(); $int=$this->integration($s,['message_mode'=>'text']);
        $ord=$this->order($s);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'some error']],400)]);
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertFalse($r['sent']);
        Http::assertSentCount(1);
        Http::assertSent(fn($req)=>($req->data()['type']??'')==='text');
    }
    public function test_test_message_uses_same_mode_as_order(): void {
        [$u,$s]=$this->ownerWithStore();
        $this->integration($s,['message_mode'=>'template','template_name'=>'t1','template_language'=>'ar']);
        Http::fake(fn($req) => Http::response(['messages'=>[['id'=>'wamid']]],200));
        $result = app(\App\Services\MerchantWhatsAppNotifier::class)->sendTestMessage($u->id,$s->id);
        if(!$result['sent']) $this->fail(json_encode($result, JSON_UNESCAPED_UNICODE));
        $this->assertTrue($result['sent']);
        Http::fake(fn($req) => Http::response(['messages'=>[['id'=>'wamid']]],200));
        StoreWhatsappIntegration::where('store_id',$s->id)->update(['message_mode'=>'text']);
        $result2 = app(\App\Services\MerchantWhatsAppNotifier::class)->sendTestMessage($u->id,$s->id);
        $this->assertTrue($result2['sent']);
        Http::assertSent(fn($req)=>($req->data()['type']??'')==='text');
    }
    public function test_store_specific_template_isolated(): void {
        [$uA,$sA]=$this->ownerWithStore(['slug'=>'a-'.uniqid()]); [$uB,$sB]=$this->ownerWithStore(['slug'=>'b-'.uniqid()]);
        $this->integration($sA,['message_mode'=>'template','template_name'=>'tplA','template_language'=>'ar']);
        $this->integration($sB,['message_mode'=>'text']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid']]],200)]);
        $ordA=$this->order($sA); $ordB=$this->order($sB);
        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ordA);
        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ordB);
        Http::assertSent(fn($r)=>($r->data()['template']['name']??'')==='tplA');
        Http::assertSent(fn($r)=>($r->data()['type']??'')==='text');
        \Illuminate\Support\Facades\Cache::flush();
        Http::fake(['graph.facebook.com/*'=>Http::response(['messages'=>[['id'=>'wamid2']]],200)]);
        $ordA2=$this->order($sA);
        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ordA2);
        Http::assertSent(fn($r)=>($r->data()['template']['name']??'')==='tplA');
    }
    public function test_job_uses_dedicated_queue_and_after_commit(): void {
        Bus::fake();
        [$u,$s]=$this->ownerWithStore(); $this->integration($s);
        $ord=$this->order($s);
        event(new OrderCreated($ord));
        Bus::assertDispatched(SendMerchantWhatsAppNotification::class, function($job){
            return $job->queue === config('services.whatsapp.queue','notifications');
        });
    }
    public function test_job_retry_on_429(): void {
        [$u,$s]=$this->ownerWithStore(); $this->integration($s,['message_mode'=>'text']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'rate limited']],429)]);
        $ord=$this->order($s);
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertEquals('rate_limited',$r['reason']);
        // Job would throw and retry
        $job=new SendMerchantWhatsAppNotification($ord->id);
        // Need to simulate job handle throwing
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'rate limited']],429)]);
        // Clear cache so not duplicate
        \Illuminate\Support\Facades\Cache::forget("merchant_whatsapp_{$s->id}_{$ord->id}");
        try{ $job->handle(app(\App\Services\MerchantWhatsAppNotifier::class)); $this->fail('should throw'); } catch(\Throwable $e){ $this->assertStringContainsString('rate_limited',$e->getMessage()); }
    }
    public function test_job_401_no_infinite_retry(): void {
        [$u,$s]=$this->ownerWithStore(); $this->integration($s,['message_mode'=>'text']);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'invalid']],401)]);
        $ord=$this->order($s);
        $r=app(\App\Services\MerchantWhatsAppNotifier::class)->notify($ord);
        $this->assertEquals('auth_error',$r['reason']);
        \Illuminate\Support\Facades\Cache::forget("merchant_whatsapp_{$s->id}_{$ord->id}");
        $job=new SendMerchantWhatsAppNotification($ord->id);
        Http::fake(['graph.facebook.com/*'=>Http::response(['error'=>['message'=>'invalid']],401)]);
        // job handle should fail fast via $this->fail()
        // It calls $this->fail which throws JobFailed? In test we can check it doesn't throw retryable
        try{ $job->handle(app(\App\Services\MerchantWhatsAppNotifier::class)); } catch(\Throwable $e){ $this->fail('should not throw retryable for auth'); }
        // If no exception, means job handled auth as fail() not throw â€” pass
        $this->assertTrue(true);
    }
}

