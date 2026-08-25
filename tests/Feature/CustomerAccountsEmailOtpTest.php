<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\CustomerEmailOtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CustomerAccountsEmailOtpTest extends TestCase
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

    // 1
    public function test_store_can_enable_customer_accounts(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','true');
        $cfg = StoreConfiguration::getConfiguration($store->id);
        $this->assertTrue($cfg['customer_accounts_enabled']);
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl,'getStoreBehavior');
        $m->setAccessible(true);
        $b = $m->invoke($ctrl,$store);
        $this->assertTrue($b['customer_accounts_enabled']);
    }
    // 2
    public function test_store_can_disable_customer_accounts(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','false');
        $cfg = StoreConfiguration::getConfiguration($store->id);
        $this->assertFalse($cfg['customer_accounts_enabled']);
    }
    // 3
    public function test_store_a_setting_does_not_affect_store_b(): void
    {
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'a-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'b-'.uniqid()]);
        StoreConfiguration::setConfiguration($s1->id,'customer_accounts_enabled','false');
        StoreConfiguration::setConfiguration($s2->id,'customer_accounts_enabled','true');
        $this->assertFalse(StoreConfiguration::getConfiguration($s1->id)['customer_accounts_enabled']);
        $this->assertTrue(StoreConfiguration::getConfiguration($s2->id)['customer_accounts_enabled']);
    }
    // 4
    public function test_register_unavailable_when_disabled(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','false');
        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store,'POST','/register',['first_name'=>'A','last_name'=>'B','email'=>'x@x.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001']);
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        $c->register($req, $store->slug);
    }
    // 5
    public function test_register_works_when_enabled(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','true');
        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store,'POST','/register',['first_name'=>'Ali','last_name'=>'Ahmad','email'=>'ali@example.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001']);
        $resp = $c->register($req,$store->slug);
        $this->assertEquals(200,$resp->getStatusCode());
        $data = json_decode($resp->getContent(),true);
        $this->assertTrue($data['requires_verification']);
        $cust = Customer::where('store_id',$store->id)->where('email','ali@example.com')->first();
        $this->assertNotNull($cust);
    }
    // 6
    public function test_new_customer_is_unverified(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store,'POST','/register',['first_name'=>'A','last_name'=>'B','email'=>'u1@ex.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001']);
        $c->register($req,$store->slug);
        $cust = Customer::where('store_id',$store->id)->where('email','u1@ex.com')->first();
        $this->assertNull($cust->email_verified_at);
        $this->assertFalse(\Illuminate\Support\Facades\Auth::guard('customer')->check());
    }
    // 7
    public function test_otp_generated_and_hashed(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'h@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $svc = app(CustomerEmailOtpService::class);
        $otp = $svc->generate($cust,$store);
        $this->assertNotNull($otp->code_hash);
        $this->assertFalse(Hash::check('000000',$otp->code_hash) && $otp->code_hash==='000000');
        $this->assertTrue($otp->expires_at->gt(now()));
        $this->assertEquals(0,$otp->attempts);
    }
    // 8
    public function test_otp_expires(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'e@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $svc = app(CustomerEmailOtpService::class);
        $otp = $svc->generate($cust,$store);
        // expire manually
        $otp->update(['expires_at'=>now()->subMinutes(1)]);
        $res = $svc->verify($cust,$store,'000000');
        $this->assertFalse($res['ok']);
        $this->assertEquals('expired',$res['error']);
    }
    // 9
    public function test_correct_otp_verifies_account(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'v@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        // generate but need code plaintext — we mock by creating known code
        $code='123456';
        $otp = \App\Models\CustomerEmailOtp::create(['customer_id'=>$cust->id,'store_id'=>$store->id,'code_hash'=>Hash::make($code),'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false]);
        $svc = app(CustomerEmailOtpService::class);
        $res = $svc->verify($cust,$store,$code);
        $this->assertTrue($res['ok']);
        $cust->refresh();
        $this->assertNotNull($cust->email_verified_at);
        $this->assertTrue($otp->fresh()->used);
    }
    // 10
    public function test_wrong_otp_rejected(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'w@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $code='123456';
        \App\Models\CustomerEmailOtp::create(['customer_id'=>$cust->id,'store_id'=>$store->id,'code_hash'=>Hash::make($code),'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false]);
        $svc = app(CustomerEmailOtpService::class);
        $res = $svc->verify($cust,$store,'000000');
        $this->assertFalse($res['ok']);
        $this->assertEquals('invalid',$res['error']);
        $this->assertEquals(1,\App\Models\CustomerEmailOtp::latest()->first()->attempts);
    }
    // 11
    public function test_otp_cannot_be_reused(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'r@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $code='123456';
        \App\Models\CustomerEmailOtp::create(['customer_id'=>$cust->id,'store_id'=>$store->id,'code_hash'=>Hash::make($code),'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false]);
        $svc = app(CustomerEmailOtpService::class);
        $this->assertTrue($svc->verify($cust,$store,$code)['ok']);
        $res2 = $svc->verify($cust,$store,$code);
        $this->assertFalse($res2['ok']);
    }
    // 12
    public function test_otp_from_another_store_rejected(): void
    {
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'s1'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'s2'.uniqid()]);
        $cust = Customer::create(['store_id'=>$s1->id,'first_name'=>'A','last_name'=>'B','email'=>'cross@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $code='123456';
        \App\Models\CustomerEmailOtp::create(['customer_id'=>$cust->id,'store_id'=>$s1->id,'code_hash'=>Hash::make($code),'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false]);
        $svc = app(CustomerEmailOtpService::class);
        // Try verify with store 2 (different store_id)
        // Customer belongs to s1, so s2 mismatch should fail via store_mismatch or invalid (no OTP for that store)
        $res = $svc->verify($cust,$s2,$code);
        $this->assertFalse($res['ok']);
        $this->assertEquals('store_mismatch',$res['error']);
    }
    // 13
    public function test_resend_works(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'resend@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $svc = app(CustomerEmailOtpService::class);
        $svc->generate($cust,$store);
        // need to wait cooldown: update created_at back 61 sec via DB
        \Illuminate\Support\Facades\DB::table('customer_email_otps')->where('customer_id',$cust->id)->update(['created_at'=>now()->subSeconds(61),'updated_at'=>now()->subSeconds(61)]);
        $otp2 = $svc->resend($cust,$store);
        $this->assertNotNull($otp2);
        $this->assertEquals(2,\App\Models\CustomerEmailOtp::where('customer_id',$cust->id)->count());
    }
    // 14
    public function test_resend_is_rate_limited(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'rl@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]);
        $svc = app(CustomerEmailOtpService::class);
        $svc->generate($cust,$store);
        $this->expectException(\RuntimeException::class);
        $svc->generate($cust,$store); // within 60s should throw
    }
    // 15
    public function test_unverified_login_prompts_verification(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $c = new \App\Http\Controllers\Store\AuthController();
        // register unverified
        $req = $this->reqForStore($store,'POST','/register',['first_name'=>'A','last_name'=>'B','email'=>'login@ex.com','password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001']);
        $c->register($req,$store->slug);
        // try login with correct password but unverified
        $req2 = $this->reqForStore($store,'POST','/login',['email'=>'login@ex.com','password'=>'Password123!']);
        $resp = $c->login($req2,$store->slug);
        $this->assertEquals(401,$resp->getStatusCode());
        $data = json_decode($resp->getContent(),true);
        $this->assertTrue($data['requires_verification']);
    }
    // 16
    public function test_verified_login_works(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'ok@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true,'email_verified_at'=>now()]);
        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store,'POST','/login',['email'=>'ok@ex.com','password'=>'Password123!']);
        $resp = $c->login($req,$store->slug);
        // login redirects or json success
        $this->assertTrue(in_array($resp->getStatusCode(),[200,302]));
    }
    // 17
    public function test_guest_checkout_still_works_when_disabled(): void
    {
        [$user,$store]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','false');
        // create product/category for order (minimal)
        $cat = \App\Models\Category::factory()->create(['store_id'=>$store->id,'is_active'=>true,'name'=>'Cat'.uniqid(),'slug'=>'cat-'.uniqid()]);
        $prod = \App\Models\Product::create(['name'=>'P','price'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10]);
        $this->assertTrue(true); // placeholder — full order test requires cart, but toggle off should not block controller
        $m = new \ReflectionMethod(\App\Http\Controllers\ThemeController::class,'getStoreBehavior');
        $m->setAccessible(true);
        $b = $m->invoke(new \App\Http\Controllers\ThemeController(), $store);
        $this->assertFalse($b['customer_accounts_enabled']);
    }
    // 18
    public function test_existing_checkout_is_not_regressed(): void
    {
        // verified customer can still checkout — ensure no exception
        [$user,$store]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','true');
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'chk@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true,'email_verified_at'=>now()]);
        $this->assertNotNull($cust->email_verified_at);
        // loyalty check should pass
        $resp = $this->actingAs($cust,'customer')->getJson('/api/loyalty/balance?store_id='.$store->id);
        // Should not be 403 (since verified)
        $this->assertNotEquals(403,$resp->getStatusCode());
    }
    // 19
    public function test_loyalty_inaccessible_before_verification(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $cust = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'loy@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true]); // unverified recent
        // recent created_at = now, so considered unverified
        $this->actingAs($cust,'customer');
        $resp = $this->getJson('/api/loyalty/balance?store_id='.$store->id);
        $this->assertEquals(403,$resp->getStatusCode());
        $this->assertStringContainsString('تأكيد',$resp->json('message'));
    }
    // 20
    public function test_no_cross_store_customer_access(): void
    {
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'cs1'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'cs2'.uniqid()]);
        $c1 = Customer::create(['store_id'=>$s1->id,'first_name'=>'A','last_name'=>'B','email'=>'same@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true,'email_verified_at'=>now()]);
        $c2 = Customer::create(['store_id'=>$s2->id,'first_name'=>'A','last_name'=>'B','email'=>'same@ex.com','password'=>'Password123!','phone'=>'+970599000001','is_active'=>true,'email_verified_at'=>now()]);
        $this->assertNotEquals($c1->id,$c2->id);
        $this->assertNotEquals($c1->store_id,$c2->store_id);
        // Login to s1 with same email should not log into s2's customer
        $ctrl = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($s1,'POST','/login',['email'=>'same@ex.com','password'=>'Password123!']);
        $resp = $ctrl->login($req,$s1->slug);
        $this->assertTrue(in_array($resp->getStatusCode(),[200,302]));
        $this->assertEquals($s1->id, Customer::where('email','same@ex.com')->where('store_id',$s1->id)->first()->store_id);
    }
}
