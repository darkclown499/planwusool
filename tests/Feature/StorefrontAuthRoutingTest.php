<?php

namespace Tests\Feature;

use App\Mail\CustomerEmailVerificationMail;
use App\Models\Customer;
use App\Models\CustomerEmailOtp;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\StoreMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Phase 4A storefront auth routing (P4A-01).
 *
 * These tests exercise the FULL HTTP stack on a store subdomain
 * ({slug}.localhost) so the DomainResolver middleware is what routes the
 * request. Before the fix, the storefront routes listed in the ticket
 * (/verify-email, /verify-email/resend, /otp/*, /returns/*) fell through to
 * DomainResolver's fail-closed abort(404) and were unreachable on subdomains.
 */
class StorefrontAuthRoutingTest extends TestCase
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

    private function connectStoreMail(Store $store): void
    {
        StoreMailService::updateConfig($store, [
            'host'=>'smtp.example.test','port'=>'587','username'=>'shop@example.com','password'=>'secret123','encryption'=>'tls','from_address'=>'noreply@example.com','from_name'=>$store->name,
        ]);
        StoreMailService::setStatus($store, StoreMailService::STATUS_CONNECTED);
    }

    private function enableCustomerAccounts(Store $store): void
    {
        StoreConfiguration::setConfiguration($store->id,'customer_accounts_enabled','true');
    }

    private function url(Store $store, string $path): string
    {
        return 'http://'.$store->slug.'.localhost'.$path;
    }

    private function postStore(Store $store, string $path, array $data=[]): TestResponse
    {
        return $this->postJson($this->url($store,$path), $data);
    }

    private function getStore(Store $store, string $path): TestResponse
    {
        return $this->getJson($this->url($store,$path));
    }

    private function otpFor(Customer $customer): ?CustomerEmailOtp
    {
        return CustomerEmailOtp::where('customer_id',$customer->id)->orderByDesc('id')->first();
    }

    // 1 — Full E2E: register on the subdomain, read the OTP from the captured
    //     store mail, verify, and assert the customer is verified + authenticated.
    public function test_verify_email_end_to_end_on_store_subdomain(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $this->connectStoreMail($store);
        $this->enableCustomerAccounts($store);

        $reg = $this->postStore($store,'/register',[
            'first_name'=>'Ali','last_name'=>'Ahmad','email'=>'ali@example.com',
            'password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001',
        ]);
        $reg->assertStatus(200)->assertJson(['success'=>true,'requires_verification'=>true]);

        $mail = Mail::sent(CustomerEmailVerificationMail::class)->first();
        $this->assertNotNull($mail);
        $code = $mail->code;
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $verify = $this->postStore($store,'/verify-email',['email'=>'ali@example.com','code'=>$code]);
        $verify->assertStatus(200)->assertJson(['success'=>true]);

        $cust = Customer::where('store_id',$store->id)->where('email','ali@example.com')->first();
        $this->assertNotNull($cust);
        $this->assertNotNull($cust->fresh()->email_verified_at);
        $this->assertTrue(Auth::guard('customer')->check());
    }

    // 2 — Wrong code must be rejected; customer stays unverified and unauthenticated.
    public function test_verify_email_with_wrong_code_rejected(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->enableCustomerAccounts($store);
        $cust = Customer::create([
            'store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'u@example.com',
            'password'=>Hash::make('Password123!'),'phone'=>'+970599000001','is_active'=>true,
        ]);
        CustomerEmailOtp::create([
            'customer_id'=>$cust->id,'store_id'=>$store->id,'code_hash'=>Hash::make('111222'),
            'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false,
        ]);

        $verify = $this->postStore($store,'/verify-email',['email'=>'u@example.com','code'=>'000000']);
        $verify->assertStatus(422)->assertJson(['success'=>false]);

        $this->assertNull($cust->fresh()->email_verified_at);
        $this->assertFalse(Auth::guard('customer')->check());
    }

    // 3 — Codes generated for store A must not verify a customer on store B's subdomain.
    public function test_verify_email_is_store_scoped(): void
    {
        Mail::fake();
        [$u1,$s1]=$this->ownerWithStore();
        [$u2,$s2]=$this->ownerWithStore();
        $this->connectStoreMail($s1);
        $this->enableCustomerAccounts($s1);

        $this->postStore($s1,'/register',[
            'first_name'=>'Ali','last_name'=>'Ahmad','email'=>'x@example.com',
            'password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001',
        ])->assertStatus(200);
        $code = Mail::sent(CustomerEmailVerificationMail::class)->first()->code;

        $verify = $this->postStore($s2,'/verify-email',['email'=>'x@example.com','code'=>$code]);
        $verify->assertStatus(422)->assertJson(['success'=>false]);

        $custA = Customer::where('store_id',$s1->id)->where('email','x@example.com')->first();
        $this->assertNotNull($custA);
        $this->assertNull($custA->fresh()->email_verified_at);
        $this->assertCount(0, Customer::where('store_id',$s2->id)->where('email','x@example.com')->get());
        $this->assertFalse(Auth::guard('customer')->check());
    }

    // 4 — Resend rotates the code: previous OTP invalidated, new code verifies.
    public function test_resend_verification_rotates_code(): void
    {
        Mail::fake();
        [$user,$store]=$this->ownerWithStore();
        $this->connectStoreMail($store);
        $this->enableCustomerAccounts($store);

        $this->postStore($store,'/register',[
            'first_name'=>'Ali','last_name'=>'Ahmad','email'=>'ali@example.com',
            'password'=>'Password123!','password_confirmation'=>'Password123!','phone'=>'+970599000001',
        ])->assertStatus(200);
        $cust = Customer::where('store_id',$store->id)->where('email','ali@example.com')->first();
        // Move past the 60s resend cooldown (DB-based on latest otp created_at).
        $oldOtp = $this->otpFor($cust);
        $oldOtp->forceFill(['created_at'=>now()->subSeconds(90)])->save();

        $resend = $this->postStore($store,'/verify-email/resend',['email'=>'ali@example.com']);
        $resend->assertStatus(200)->assertJson(['success'=>true]);

        // Previous code is invalidated; a fresh unused code exists for the customer.
        $this->assertTrue((bool)$oldOtp->fresh()->used);
        $rows = CustomerEmailOtp::where('customer_id',$cust->id)->orderByDesc('id')->get();
        $this->assertGreaterThanOrEqual(2, $rows->count());
        $this->assertFalse((bool)$rows->first()->used);

        $code = collect(Mail::sent(CustomerEmailVerificationMail::class))->last()->code;
        $this->postStore($store,'/verify-email',['email'=>'ali@example.com','code'=>$code])
            ->assertStatus(200)->assertJson(['success'=>true]);

        $this->assertNotNull($cust->fresh()->email_verified_at);
    }

    // 5 — GET on the POST-only verify path performs no state change (method safety).
    public function test_get_verify_email_is_method_safe(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->enableCustomerAccounts($store);
        $cust = Customer::create([
            'store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'u2@example.com',
            'password'=>Hash::make('Password123!'),'phone'=>'+970599000001','is_active'=>true,
        ]);
        CustomerEmailOtp::create([
            'customer_id'=>$cust->id,'store_id'=>$store->id,'code_hash'=>Hash::make('111222'),
            'expires_at'=>now()->addMinutes(10),'attempts'=>0,'max_attempts'=>5,'used'=>false,
        ]);

        $resp = $this->getStore($store,'/verify-email');
        $this->assertNotEquals(404, $resp->getStatusCode());

        $this->assertNull($cust->fresh()->email_verified_at);
        $this->assertFalse(Auth::guard('customer')->check());
    }

    // 6 — Fail-closed: unknown paths still 404 via DomainResolver.
    public function test_unknown_storefront_path_still_fails_closed(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->postStore($store,'/no-such-endpoint',[])->assertStatus(404);
    }

    // 7 — /otp/* express-checkout endpoints dispatch on the store subdomain
    // (B2-03: SMS is unconfigured in tests, so each call must dispatch to the
    // controller and answer truthfully — not a DomainResolver 404, and never a
    // fake "success" for a code that was not actually delivered).
    public function test_storefront_phone_otp_endpoints_reachable(): void
    {
        [$user,$store]=$this->ownerWithStore();

        $send = $this->postStore($store,'/otp/send',['phone'=>'+970599000001']);
        $this->assertNotEquals(404, $send->getStatusCode());
        $send->assertJson(['success'=>false]);

        $verify = $this->postStore($store,'/otp/verify',['phone'=>'+970599000001','code'=>'000000']);
        $this->assertNotEquals(404, $verify->getStatusCode());
        $verify->assertJson(['verified'=>false]);

        $resend = $this->postStore($store,'/otp/resend',['phone'=>'+970599000001']);
        $this->assertNotEquals(404, $resend->getStatusCode());
        $resend->assertJson(['success'=>false]);
    }

    // 8 — /returns/* dispatch on the store subdomain (validation reached, not DomainResolver 404).
    public function test_storefront_returns_endpoints_reachable(): void
    {
        [$user,$store]=$this->ownerWithStore();

        $r = $this->postStore($store,'/returns/request',[]);
        $this->assertNotEquals(404, $r->getStatusCode());
        $this->assertNotNull($r->json('errors.order_id'));

        $this->getStore($store,'/returns/history')->assertOk()->assertJson(['returns'=>[]]);
    }
}