<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StorefrontPhoneOtp;
use App\Models\User;
use App\Services\OtpService;
use App\Services\StorefrontOtpSmsGateway;
use App\Services\StorefrontPhoneOtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * B2-03 Storefront phone OTP hardening.
 *
 * Guarantees the storefront express-checkout phone OTP is:
 *  - hashed at rest (never plaintext)
 *  - explicitly store-scoped (server authority, not a type string/phone/client id)
 *  - one-time, expiring, attempt-limited
 *  - resend-cooldown + hourly-cap limited
 *  - truthful on SMS delivery failure (no usable OTP left behind)
 *  - isolated from the legacy platform VerificationCode/OtpService flows
 */
class StorefrontPhoneOtpTest extends TestCase
{
    use RefreshDatabase;

    private string $phone = '+970599000001';
    private string $phone2 = '+970599000002';
    private string $canonical = '970599000001';
    private string $canonical2 = '970599000002';

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

    private function fakeGateway(bool $sendResult = true): StorefrontOtpSmsGateway
    {
        $gateway = new class($sendResult) extends StorefrontOtpSmsGateway {
            public array $sent = [];
            public function __construct(private bool $result) {}
            public function send(Store $store, string $phone, string $message): bool
            {
                preg_match('/\b(\d{6})\b/', $message, $m);
                $this->sent[] = ['store_id'=>$store->id,'phone'=>$phone,'code'=>$m[1] ?? null];
                return $this->result;
            }
        };
        $this->app->instance(StorefrontOtpSmsGateway::class, $gateway);
        return $gateway;
    }

    private function svc(): StorefrontPhoneOtpService
    {
        return app(StorefrontPhoneOtpService::class);
    }

    private function makeCodeOtp(Store $store, string $phone, string $code, array $overrides = []): StorefrontPhoneOtp
    {
        return StorefrontPhoneOtp::create(array_merge([
            'store_id'=>$store->id,
            'phone'=>$phone,
            'code_hash'=>Hash::make($code),
            'expires_at'=>now()->addMinutes(10),
            'attempts'=>0,
            'max_attempts'=>5,
            'used'=>false,
        ], $overrides));
    }

    private function url(Store $store, string $path): string
    {
        return 'http://'.$store->slug.'.localhost'.$path;
    }

    private function postStore(Store $store, string $path, array $data=[]): \Illuminate\Testing\TestResponse
    {
        return $this->postJson($this->url($store,$path), $data);
    }

    // 1 — new storefront phone OTP stored hashed + 2 — store_id persisted explicitly
    public function test_otp_stored_hashed_with_explicit_store_id(): void
    {
        $this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        $this->svc()->generate($store,$this->phone);

        $row = StorefrontPhoneOtp::where('store_id',$store->id)->where('phone',$this->canonical)->first();
        $this->assertNotNull($row);
        $this->assertEquals($store->id,$row->store_id);
        $this->assertNotSame('',$row->code_hash);
        $this->assertTrue($row->expires_at->gt(now()));
        $this->assertEquals(0,$row->attempts);
        $this->assertFalse((bool)$row->used);
    }

    // 3 — raw code is never stored
    public function test_raw_code_not_stored_in_database(): void
    {
        $gateway=$this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        $this->svc()->generate($store,$this->phone);

        $code = $gateway->sent[0]['code'];
        $row = StorefrontPhoneOtp::where('store_id',$store->id)->first();
        $this->assertNotNull($code);
        // Hash-checkable but never plaintext, never equal, never embedded.
        $this->assertTrue(Hash::check($code,$row->code_hash));
        $this->assertNotSame($code,$row->code_hash);
        $this->assertStringNotContainsString($code,$row->code_hash);
        $this->assertNotContains($code,array_values($row->getAttributes()));
        // No plaintext column exists on the table.
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('storefront_phone_otps');
        $this->assertArrayNotHasKey('code',array_flip($columns));
        $this->assertArrayNotHasKey('verification_code',array_flip($columns));
    }

    // 4 — correct code verifies (service level)
    public function test_correct_code_verifies(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->makeCodeOtp($store,$this->canonical,'123456');

        $res = $this->svc()->verify($store,$this->phone,'123456');
        $this->assertTrue($res['ok']);
        $row = StorefrontPhoneOtp::where('store_id',$store->id)->first();
        $this->assertTrue((bool)$row->used);
        $this->assertNotNull($row->verified_at);
    }

    // 5 — wrong code increments attempts
    public function test_wrong_code_increments_attempts(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->makeCodeOtp($store,$this->canonical,'123456');

        $res = $this->svc()->verify($store,$this->phone,'000000');
        $this->assertFalse($res['ok']);
        $this->assertEquals('invalid',$res['error']);
        $this->assertEquals(1,StorefrontPhoneOtp::where('store_id',$store->id)->first()->attempts);
    }

    // 6 — max attempts fail closed
    public function test_max_attempts_fail_closed(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->makeCodeOtp($store,$this->canonical,'123456');

        foreach (['000000','111111','222222','333333','444444'] as $i=>$wrong) {
            $res = $this->svc()->verify($store,$this->phone,$wrong);
            if ($i === 4) {
                $this->assertFalse($res['ok']);
                $this->assertEquals('too_many',$res['error']);
            }
        }
        $row = StorefrontPhoneOtp::where('store_id',$store->id)->first();
        $this->assertEquals(5,$row->attempts);
        $this->assertTrue((bool)$row->used);
        // Correct code is now also denied.
        $res = $this->svc()->verify($store,$this->phone,'123456');
        $this->assertFalse($res['ok']);
    }

    // 7 — expired code denied
    public function test_expired_code_denied(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->makeCodeOtp($store,$this->canonical,'123456',['expires_at'=>now()->subMinutes(1)]);

        $res = $this->svc()->verify($store,$this->phone,'123456');
        $this->assertFalse($res['ok']);
        $this->assertEquals('expired',$res['error']);
    }

    // 8 — used code denied and replay denied
    public function test_used_code_denied_and_replay_denied(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->makeCodeOtp($store,$this->canonical,'123456');

        $this->assertTrue($this->svc()->verify($store,$this->phone,'123456')['ok']);
        $res2 = $this->svc()->verify($store,$this->phone,'123456');
        $this->assertFalse($res2['ok']);
    }

    // 9 — Store A code denied on Store B
    public function test_store_a_code_denied_on_store_b(): void
    {
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'sa-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'sb-'.uniqid()]);
        $this->makeCodeOtp($s1,$this->canonical,'123456');

        $res = $this->svc()->verify($s2,$this->phone,'123456');
        $this->assertFalse($res['ok']);
        $this->assertEquals('invalid',$res['error']);
        $this->assertSame(0,StorefrontPhoneOtp::where('store_id',$s2->id)->count());
        // Original still usable on store A (only failed on B).
        $this->assertTrue($this->svc()->verify($s1,$this->phone,'123456')['ok']);
    }

    // 10 — phone mismatch denied
    public function test_phone_mismatch_denied(): void
    {
        [$user,$store]=$this->ownerWithStore();
        $this->makeCodeOtp($store,$this->canonical,'123456');

        $res = $this->svc()->verify($store,$this->phone2,'123456');
        $this->assertFalse($res['ok']);
        $this->assertEquals('invalid',$res['error']);
    }

    // 11 — resend invalidates previous code
    public function test_resend_invalidates_previous_code(): void
    {
        $gateway=$this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        $this->svc()->generate($store,$this->phone);
        $old = StorefrontPhoneOtp::where('store_id',$store->id)->first();

        // Move past the 60s resend cooldown.
        DB::table('storefront_phone_otps')->where('id',$old->id)->update(['created_at'=>now()->subSeconds(90),'updated_at'=>now()->subSeconds(90)]);

        $new = $this->svc()->resend($store,$this->phone);
        $this->assertTrue((bool)$old->fresh()->used);
        $this->assertFalse((bool)$new->used);
        $this->assertSame(2,StorefrontPhoneOtp::where('store_id',$store->id)->count());

        // The NEW code (from the last SMS) verifies; the old code does not.
        $newCode = $gateway->sent[1]['code'];
        $this->assertTrue($this->svc()->verify($store,$this->phone,$newCode)['ok']);
    }

    // 12 — resend cooldown enforced
    public function test_resend_cooldown_enforced(): void
    {
        $this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        $this->svc()->generate($store,$this->phone);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/rate_limited_cooldown/');
        $this->svc()->generate($store,$this->phone);
    }

    // 13 — hourly cap enforced
    public function test_hourly_cap_enforced(): void
    {
        $this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        for ($i=0;$i<5;$i++) {
            DB::table('storefront_phone_otps')->insert([
                'store_id'=>$store->id,
                'phone'=>$this->canonical,
                'code_hash'=>Hash::make('123456'),
                'expires_at'=>now()->addMinutes(10),
                'attempts'=>0,
                'max_attempts'=>5,
                'used'=>false,
                'created_at'=>now()->subMinutes(10+$i),
                'updated_at'=>now()->subMinutes(10+$i),
            ]);
        }

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/rate_limited_hour/');
        $this->svc()->generate($store,$this->phone);
    }

    // 14 — SMS send failure leaves no usable OTP
    public function test_sms_send_failure_leaves_no_usable_otp(): void
    {
        $this->fakeGateway(false);
        [$user,$store]=$this->ownerWithStore();

        try {
            $this->svc()->generate($store,$this->phone);
            $this->fail('generate() must throw on SMS failure');
        } catch (\RuntimeException $e) {
            $this->assertStringStartsWith('sms_failed',$e->getMessage());
        }

        $this->assertSame(0,StorefrontPhoneOtp::where('store_id',$store->id)->where('used',false)->count());
        $rows = StorefrontPhoneOtp::where('store_id',$store->id)->get();
        foreach ($rows as $row) {
            $this->assertTrue((bool)$row->used,'failed-send OTP must not remain usable');
        }
        // The phone can never verify via the new flow after a confirmed failure.
        $res = $this->svc()->verify($store,$this->phone,'123456');
        $this->assertFalse($res['ok']);
    }

    // 15 — SMS send success leaves a usable OTP
    public function test_sms_success_leaves_usable_otp(): void
    {
        $this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        $otp = $this->svc()->generate($store,$this->phone);
        $this->assertNotNull($otp);
        $this->assertFalse((bool)$otp->fresh()->used);
    }

    // 16 — platform legacy VerificationCode flow is untouched
    public function test_platform_legacy_verification_code_flow_still_works(): void
    {
        $svc = app(OtpService::class);
        $code = $svc->generate('merchant@example.com','register');
        $this->assertMatchesRegularExpression('/^\d{6}$/',$code);
        $row = \App\Models\VerificationCode::where('email','merchant@example.com')->where('type','register')->latest()->first();
        $this->assertNotNull($row);
        // Legacy platform contract preserved: code readable via legacy service.
        $this->assertSame($code,$row->code);
        $this->assertTrue($svc->verify('merchant@example.com',$code,'register'));
        $this->assertFalse($svc->verify('merchant@example.com',$code,'register'));
        $this->assertTrue((bool)$row->fresh()->used);
    }

    // 17 — legacy plaintext storefront codes no longer verify (clean cutover)
    public function test_legacy_plaintext_storefront_code_does_not_verify_new_endpoint(): void
    {
        $this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();
        \App\Models\VerificationCode::create([
            'email'=>$this->phone,
            'code'=>'111222',
            'type'=>'storefront_'.$store->id,
            'expires_at'=>now()->addMinutes(10),
            'used'=>false,
        ]);

        $verify = $this->postStore($store,'/otp/verify',['phone'=>$this->phone,'code'=>'111222']);
        $verify->assertStatus(422)->assertJson(['verified'=>false]);
        $this->assertFalse(\App\Models\VerificationCode::where('type','storefront_'.$store->id)->first()->used);
    }

    // HTTP-level 18-20 — full E2E + truthful failure + cross-store + spoofed store_id
    public function test_send_and_verify_full_flow_on_store_domain(): void
    {
        $gateway=$this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();

        $send = $this->postStore($store,'/otp/send',['phone'=>$this->phone]);
        $send->assertStatus(200)->assertJson(['success'=>true]);

        $code = $gateway->sent[0]['code'];
        $this->assertNotNull($code);

        $verify = $this->postStore($store,'/otp/verify',['phone'=>$this->phone,'code'=>$code]);
        $verify->assertStatus(200)->assertJson(['verified'=>true]);

        // replay denied over HTTP
        $verify2 = $this->postStore($store,'/otp/verify',['phone'=>$this->phone,'code'=>$code]);
        $verify2->assertStatus(422)->assertJson(['verified'=>false]);
    }

    public function test_send_returns_truthful_failure_when_sms_fails_http(): void
    {
        $this->fakeGateway(false);
        [$user,$store]=$this->ownerWithStore();

        $send = $this->postStore($store,'/otp/send',['phone'=>$this->phone]);
        $send->assertStatus(422)->assertJson(['success'=>false]);
        $this->assertFalse($send->json('success'));
        $this->assertNotEmpty($send->json('message'));
        $this->assertSame(0,StorefrontPhoneOtp::where('store_id',$store->id)->where('used',false)->count());
    }

    public function test_resend_http_dispatch_and_rate_limit(): void
    {
        $gateway=$this->fakeGateway(true);
        [$user,$store]=$this->ownerWithStore();

        $this->postStore($store,'/otp/send',['phone'=>$this->phone])->assertStatus(200);
        // Immediate resend within the 60s cooldown is rejected.
        $resend = $this->postStore($store,'/otp/resend',['phone'=>$this->phone]);
        $resend->assertStatus(429)->assertJson(['success'=>false]);

        // Past cooldown, resend rotates the code.
        DB::table('storefront_phone_otps')->update(['created_at'=>now()->subSeconds(90),'updated_at'=>now()->subSeconds(90)]);
        $resend2 = $this->postStore($store,'/otp/resend',['phone'=>$this->phone]);
        $resend2->assertStatus(200)->assertJson(['success'=>true]);
        $newCode = $gateway->sent[1]['code'];
        $this->assertNotEquals($gateway->sent[0]['code'],$newCode);
        $this->postStore($store,'/otp/verify',['phone'=>$this->phone,'code'=>$newCode])->assertStatus(200)->assertJson(['verified'=>true]);
    }

    public function test_client_supplied_store_id_is_never_authority(): void
    {
        $gateway=$this->fakeGateway(true);
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'spoof-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'other-'.uniqid()]);

        // Client claims store s2 while actually on s1's subdomain.
        $send = $this->postStore($s1,'/otp/send',['phone'=>$this->phone,'store_id'=>$s2->id]);
        $send->assertStatus(200)->assertJson(['success'=>true]);

        $rows = StorefrontPhoneOtp::where('phone',$this->canonical)->get();
        $this->assertCount(1,$rows);
        $this->assertEquals($s1->id,$rows->first()->store_id);
        $this->assertSame(0,StorefrontPhoneOtp::where('store_id',$s2->id)->count());
    }

    public function test_cross_store_http_verification_denied(): void
    {
        $gateway=$this->fakeGateway(true);
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'ca-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'cb-'.uniqid()]);

        $this->postStore($s1,'/otp/send',['phone'=>$this->phone])->assertStatus(200);
        $code = $gateway->sent[0]['code'];

        // Same phone+code submitted on store B's subdomain must fail.
        $verify = $this->postStore($s2,'/otp/verify',['phone'=>$this->phone,'code'=>$code]);
        $verify->assertStatus(422)->assertJson(['verified'=>false]);

        // And store A's code is still intact.
        $this->postStore($s1,'/otp/verify',['phone'=>$this->phone,'code'=>$code])->assertStatus(200)->assertJson(['verified'=>true]);
    }
}