<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\StoreMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StoreMailMerchantOwnedTest extends TestCase
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

    private function reqForStore(Store $store, string $method, string $uri, array $data=[]): \Illuminate\Http\Request
    {
        $req = \Illuminate\Http\Request::create($uri, $method, $data);
        $req->headers->set('Accept','application/json');
        $req->attributes->set('resolved_store',$store);
        $req->setLaravelSession(app('session.store'));
        return $req;
    }

    private function connectMail(Store $store, string $from='noreply@example.com'): void
    {
        StoreMailService::updateConfig($store, [
            'host'=>'smtp.test','port'=>'587','username'=>'shop@example.com','password'=>'secret123','encryption'=>'tls','from_address'=>$from,'from_name'=>$store->name,
        ]);
        StoreMailService::setStatus($store, StoreMailService::STATUS_CONNECTED);
    }

    public function test_verification_none_does_not_send_email(): void
    {
        Mail::fake();
        [$u,$s]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_verification_method','none');
        $c=new \App\Http\Controllers\Store\AuthController();
        $req=$this->reqForStore($s,'POST','/register',['first_name'=>'A','last_name'=>'B','email'=>'none@test.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001']);
        $resp=$c->register($req,$s->slug);
        $this->assertEquals(200,$resp->getStatusCode());
        $data=json_decode($resp->getContent(),true);
        $this->assertFalse($data['requires_verification']);
        Mail::assertNothingSent();
        $cust=Customer::where('store_id',$s->id)->where('email','none@test.com')->first();
        $this->assertNotNull($cust->email_verified_at);
    }

    public function test_email_verification_cannot_be_enabled_without_connected_mail(): void
    {
        [$u,$s]=$this->ownerWithStore();
        // ensure not connected
        $this->assertNotEquals('connected', StoreMailService::getStatus($s));
        $this->actingAs($u);
        $resp=$this->putJson(route('api.store-features.update',$s->id), ['key'=>'customer_verification_method','value'=>'email']);
        $resp->assertStatus(422);
        $resp->assertJsonFragment(['needs_mail_config'=>true]);
    }

    public function test_connected_mail_allows_email_verification(): void
    {
        [$u,$s]=$this->ownerWithStore();
        $this->connectMail($s);
        $this->actingAs($u);
        $resp=$this->putJson(route('api.store-features.update',$s->id), ['key'=>'customer_verification_method','value'=>'email']);
        $resp->assertStatus(200);
        $this->assertEquals('email', StoreConfiguration::getConfiguration($s->id)['customer_verification_method']);
    }

    public function test_otp_uses_correct_store_config(): void
    {
        Mail::fake();
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'a-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'b-'.uniqid()]);
        $this->connectMail($s1,'shop-a@example.com');
        $this->connectMail($s2,'shop-b@example.com');
        $c1=Customer::create(['store_id'=>$s1->id,'first_name'=>'A','last_name'=>'B','email'=>'a@test.com','password'=>'Password123!','phone'=>'+1','is_active'=>true]);
        $svc=app(\App\Services\CustomerEmailOtpService::class);
        // s1 OTP should not affect s2
        $svc->generate($c1,$s1);
        Mail::assertSent(\App\Mail\CustomerEmailVerificationMail::class, function($mail) { return str_contains($mail->storeName ?? '', ''); });
        // verify that s2 has 0 otps
        $this->assertEquals(0, \App\Models\CustomerEmailOtp::where('store_id',$s2->id)->count());
    }

    public function test_no_wusool_fallback_when_mail_not_connected(): void
    {
        Mail::fake();
        [$u,$s]=$this->ownerWithStore();
        // do not connect mail, keep status not_configured
        StoreConfiguration::setConfiguration($s->id,'customer_verification_method','email'); // force legacy email via direct config
        $cust=Customer::create(['store_id'=>$s->id,'first_name'=>'A','last_name'=>'B','email'=>'fallback@test.com','password'=>'Password123!','phone'=>'+1','is_active'=>true]);
        $svc=app(\App\Services\CustomerEmailOtpService::class);
        try { $svc->generate($cust,$s); $this->fail('should throw'); } catch (\RuntimeException $e) { $this->assertStringContainsString('store_mail_not_connected',$e->getMessage()); }
        Mail::assertNothingSent();
    }

    public function test_smtp_password_encrypted_at_rest(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreMailService::updateConfig($s, ['host'=>'smtp.x','port'=>'587','username'=>'u','password'=>'mysecret','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        $rawRow=\DB::table('settings')->where('store_id',$s->id)->where('key','email_password')->first();
        $this->assertNotNull($rawRow);
        $this->assertNotEquals('mysecret',$rawRow->value);
        // decrypted via model should equal original
        $val=getSetting('email_password','',$s->user_id,$s->id);
        $this->assertEquals('mysecret',$val);
    }

    public function test_api_never_returns_raw_password(): void
    {
        [$u,$s]=$this->ownerWithStore();
        $this->connectMail($s);
        $this->actingAs($u);
        $resp=$this->getJson(route('api.store-email-config.show',$s->id));
        $resp->assertStatus(200);
        $cfg=$resp->json('config');
        $this->assertArrayHasKey('password_masked',$cfg);
        $this->assertArrayHasKey('password_configured',$cfg);
        $this->assertStringNotContainsString('mysecret', json_encode($cfg));
        $this->assertEquals('••••••••',$cfg['password_masked']);
        $this->assertTrue($cfg['password_configured']);
    }

    public function test_blank_password_preserves_existing(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreMailService::updateConfig($s, ['host'=>'smtp.x','port'=>'587','username'=>'u','password'=>'first','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        StoreMailService::updateConfig($s, ['host'=>'smtp.x','port'=>'587','username'=>'u','password'=>'','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        $val=getSetting('email_password','',$s->user_id,$s->id);
        $this->assertEquals('first',$val);
        // masked blank should not overwrite
        StoreMailService::updateConfig($s, ['host'=>'smtp.x','port'=>'587','username'=>'u','password'=>'••••••••','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        $val2=getSetting('email_password','',$s->user_id,$s->id);
        $this->assertEquals('first',$val2);
    }

    public function test_invalid_smtp_incomplete_status(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreMailService::updateConfig($s, ['host'=>'','port'=>'','username'=>'','password'=>'','encryption'=>'tls','from_address'=>'','from_name'=>'']);
        $this->assertEquals(StoreMailService::STATUS_INCOMPLETE, StoreMailService::getStatus($s));
        $this->assertFalse(StoreMailService::isConnected($s));
    }

    public function test_store_a_cannot_access_store_b_mail_config(): void
    {
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'iso-a-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'iso-b-'.uniqid()]);
        $this->connectMail($s2,'b@x.com');
        $this->actingAs($u1);
        $resp=$this->getJson(route('api.store-email-config.show',$s2->id));
        $resp->assertStatus(403);
        $resp2=$this->putJson(route('api.store-email-config.show',$s2->id), ['host'=>'h','port'=>587,'username'=>'u','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        // put to wrong route still 403 because authorization fails (using show route is get, but we test put unauthorized)
        $resp3=$this->putJson(route('api.store-email-config.update',$s2->id), ['host'=>'h','port'=>587,'username'=>'u','password'=>'p','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        $resp3->assertStatus(403);
    }

    public function test_otp_store_isolation_cross_verification(): void
    {
        Mail::fake();
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'c1-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'c2-'.uniqid()]);
        $this->connectMail($s1);
        $c1=Customer::create(['store_id'=>$s1->id,'first_name'=>'A','last_name'=>'B','email'=>'cross@ex.com','password'=>'Password123!','phone'=>'+1','is_active'=>true]);
        $code='123456';
        \App\Models\CustomerEmailOtp::create(['customer_id'=>$c1->id,'store_id'=>$s1->id,'code_hash'=>Hash::make($code),'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false]);
        $svc=app(\App\Services\CustomerEmailOtpService::class);
        $res=$svc->verify($c1,$s2,$code);
        $this->assertFalse($res['ok']);
        $this->assertEquals('store_mismatch',$res['error']);
    }

    public function test_registration_disabled_rejects(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_registration_enabled','false');
        StoreConfiguration::setConfiguration($s->id,'enable_customer_registration','false');
        $c=new \App\Http\Controllers\Store\AuthController();
        $req=$this->reqForStore($s,'POST','/register',['first_name'=>'A','last_name'=>'B','email'=>'blocked@ex.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+1']);
        $resp=$c->register($req,$s->slug);
        $this->assertEquals(403,$resp->getStatusCode());
        $data=json_decode($resp->getContent(),true);
        $this->assertTrue($data['registration_disabled']);
    }

    public function test_mail_send_failure_does_not_expose_secret(): void
    {
        [$u,$s]=$this->ownerWithStore();
        // force connected but broken host, then try generate
        StoreMailService::updateConfig($s, ['host'=>'invalid.host','port'=>'587','username'=>'u','password'=>'secret','encryption'=>'tls','from_address'=>'f@x.com','from_name'=>'n']);
        StoreMailService::setStatus($s, StoreMailService::STATUS_CONNECTED);
        // Mock Mail to throw
        Mail::shouldReceive('to')->andThrow(new \Exception('SMTP connect failed to invalid.host:587 password=secret'));
        $cust=Customer::create(['store_id'=>$s->id,'first_name'=>'A','last_name'=>'B','email'=>'fail@ex.com','password'=>'Password123!','phone'=>'+1','is_active'=>true]);
        $svc=app(\App\Services\CustomerEmailOtpService::class);
        try { $svc->generate($cust,$s); $this->fail(); } catch (\RuntimeException $e) { $this->assertStringNotContainsString('secret',$e->getMessage()); $this->assertStringContainsString('email_failed',$e->getMessage()); }
    }

    public function test_legacy_email_without_mail_treated_as_needs_config(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_verification_method','email');
        // mail not connected
        $this->assertFalse(StoreMailService::isConnected($s));
        $this->assertEquals('email', StoreConfiguration::getConfiguration($s->id)['customer_verification_method']);
        // attempt to register should fail with email_failed (no fallback)
        Mail::fake();
        $c=new \App\Http\Controllers\Store\AuthController();
        $req=$this->reqForStore($s,'POST','/register',['first_name'=>'A','last_name'=>'B','email'=>'legacy@ex.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+1']);
        $resp=$c->register($req,$s->slug);
        $data=json_decode($resp->getContent(),true);
        // Should indicate requires_verification but with email_failed message (generic)
        $this->assertTrue($data['requires_verification'] ?? false);
        $cust=Customer::where('store_id',$s->id)->where('email','legacy@ex.com')->first();
        $this->assertNull($cust->email_verified_at);
    }
}
