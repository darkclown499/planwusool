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

/**
 * Regression: verification_method=none must NEVER trigger email OTP.
 *
 * This covers the exact reported bug: merchant sets verification to
 * "بدون تحقق" (none) in the dashboard, but the storefront still
 * prompts a 6-digit OTP screen during registration.
 */
class VerificationNoneMustNotTriggerOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Clear the static request-level config cache from prior tests
        \Illuminate\Support\Facades\Cache::flush();
        \App\Models\StoreConfiguration::flushRequestCache();
    }

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'P'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'TStore';
        $store->slug = $attrs['slug'] ?? 'tstore-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'fashion-atelier';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function reqForStore(Store $store, string $method, string $uri, array $data = []): \Illuminate\Http\Request
    {
        $req = \Illuminate\Http\Request::create($uri, $method, $data);
        $req->headers->set('Accept', 'application/json');
        $req->attributes->set('resolved_store', $store);
        $req->setLaravelSession(app('session.store'));
        return $req;
    }

    private function behavior(Store $store): array
    {
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl, 'getStoreBehavior');
        $m->setAccessible(true);
        return $m->invoke($ctrl, $store);
    }

    private function authBehavior(Store $store): array
    {
        $c = new \App\Http\Controllers\Store\AuthController();
        $m = new \ReflectionMethod($c, 'behavior');
        $m->setAccessible(true);
        return $m->invoke($c, $store);
    }

    // ── CORE BUG: verification=none → register must not require OTP ──

    public function test_verification_none_register_returns_no_otp(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'Ahmad',
            'last_name' => 'Ali',
            'email' => 'ahmad@test.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone' => '+970599000001',
        ]);

        $resp = $c->register($req, $store->slug);
        $data = json_decode($resp->getContent(), true);

        $this->assertEquals(200, $resp->getStatusCode());
        $this->assertArrayHasKey('requires_verification', $data);
        $this->assertFalse($data['requires_verification'], 'verification=none MUST return requires_verification=false');
        $this->assertTrue($data['success']);
    }

    public function test_verification_none_customer_created_verified(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'Sara',
            'last_name' => 'Mohammed',
            'email' => 'sara@test.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone' => '+970599000002',
        ]);

        $c->register($req, $store->slug);

        $cust = Customer::where('store_id', $store->id)->where('email', 'sara@test.com')->first();
        $this->assertNotNull($cust);
        $this->assertNotNull($cust->email_verified_at, 'verification=none must set email_verified_at immediately');
        $this->assertTrue($cust->is_active);
    }

    public function test_verification_none_no_otp_record_created(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'Khalid',
            'last_name' => 'Omar',
            'email' => 'khalid@test.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone' => '+970599000003',
        ]);

        $c->register($req, $store->slug);

        $otpCount = \App\Models\CustomerEmailOtp::where('store_id', $store->id)
            ->whereHas('customer', fn($q) => $q->where('email', 'khalid@test.com'))
            ->count();
        $this->assertEquals(0, $otpCount, 'verification=none must NOT create any OTP records');
    }

    public function test_verification_none_customer_auto_logged_in(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'Fatima',
            'last_name' => 'Hassan',
            'email' => 'fatima@test.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone' => '+970599000004',
        ]);

        $resp = $c->register($req, $store->slug);
        $data = json_decode($resp->getContent(), true);

        $this->assertTrue($data['success']);
        $this->assertFalse($data['requires_verification']);
        $this->assertNotEmpty($data['message']);
    }

    // ── Behavior reads correctly ──

    public function test_behavior_verification_none_read_correctly(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $themeBehavior = $this->behavior($store);
        $authBehavior = $this->authBehavior($store);

        $this->assertEquals('none', $themeBehavior['customer_verification_method']);
        $this->assertEquals('none', $authBehavior['customer_verification_method']);
    }

    public function test_behavior_verification_email_read_correctly(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'email');

        $themeBehavior = $this->behavior($store);
        $authBehavior = $this->authBehavior($store);

        $this->assertEquals('email', $themeBehavior['customer_verification_method']);
        $this->assertEquals('email', $authBehavior['customer_verification_method']);
    }

    public function test_behavior_verification_defaults_to_email(): void
    {
        [$user, $store] = $this->ownerWithStore();

        $themeBehavior = $this->behavior($store);
        $authBehavior = $this->authBehavior($store);

        $this->assertEquals('email', $themeBehavior['customer_verification_method'], 'default must be email');
        $this->assertEquals('email', $authBehavior['customer_verification_method'], 'default must be email');
    }

    public function test_behavior_verification_invalid_value_defaults_to_email(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'sms');

        $themeBehavior = $this->behavior($store);
        $this->assertEquals('email', $themeBehavior['customer_verification_method'], 'invalid value must fallback to email');
    }

    // ── Login with verification=none auto-verifies unverified customers ──

    public function test_verification_none_login_auto_verifies_legacy(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $cust = Customer::create([
            'store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B',
            'email' => 'legacy@test.com', 'password' => 'Password123!',
            'phone' => '+970599000001', 'is_active' => true,
            // email_verified_at is null = unverified legacy customer
        ]);

        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/login', [
            'email' => 'legacy@test.com', 'password' => 'Password123!',
        ]);

        $resp = $c->login($req, $store->slug);
        $data = json_decode($resp->getContent(), true);

        $this->assertTrue($data['success'], 'verification=none login should auto-verify and succeed');

        $cust->refresh();
        $this->assertNotNull($cust->email_verified_at, 'legacy customer should be auto-verified');
    }

    // ── Switch from email to none after OTP pending ──

    public function test_switch_to_none_allows_unverified_login(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore();

        // Initially email verification
        $this->connectStoreMail($store);

        // Create customer via register (unverified)
        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'Test', 'last_name' => 'User',
            'email' => 'switch@test.com', 'password' => 'Password123!',
            'password_confirmation' => 'Password123!', 'phone' => '+970599000001',
        ]);
        $c->register($req, $store->slug);

        $cust = Customer::where('store_id', $store->id)->where('email', 'switch@test.com')->first();
        $this->assertNotNull($cust);
        $this->assertNull($cust->email_verified_at, 'customer should be unverified');

        // Merchant switches to none
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        // Verify the behavior reflects the change
        $b = $this->authBehavior($store);
        $this->assertEquals('none', $b['customer_verification_method']);

        // Login should now auto-verify and succeed
        $req2 = $this->reqForStore($store, 'POST', '/login', [
            'email' => 'switch@test.com', 'password' => 'Password123!',
        ]);
        $resp = $c->login($req2, $store->slug);

        // Refresh customer from DB
        $cust->refresh();
        $this->assertNotNull($cust->email_verified_at, 'legacy customer should be auto-verified after switch to none');
    }

    // ── Email verification still works when set to email ──

    public function test_email_verification_still_triggers_otp(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore();
        $this->connectStoreMail($store);
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'email');

        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'Email', 'last_name' => 'User',
            'email' => 'emailuser@test.com', 'password' => 'Password123!',
            'password_confirmation' => 'Password123!', 'phone' => '+970599000001',
        ]);

        $resp = $c->register($req, $store->slug);
        $data = json_decode($resp->getContent(), true);

        $this->assertTrue($data['requires_verification'], 'email verification MUST return requires_verification=true');
        $this->assertTrue($data['success']);
    }

    // ── Cross-store isolation ──

    public function test_verification_method_is_store_scoped(): void
    {
        [$u1, $s1] = $this->ownerWithStore(['slug' => 'vs1-'.uniqid()]);
        [$u2, $s2] = $this->ownerWithStore(['slug' => 'vs2-'.uniqid()]);

        StoreConfiguration::setConfiguration($s1->id, 'customer_verification_method', 'none');
        StoreConfiguration::setConfiguration($s2->id, 'customer_verification_method', 'email');

        $b1 = $this->behavior($s1);
        $b2 = $this->behavior($s2);

        $this->assertEquals('none', $b1['customer_verification_method']);
        $this->assertEquals('email', $b2['customer_verification_method']);
    }

    // ── Combined: master OFF + verification=none ──

    public function test_master_off_overrides_verification_none(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_accounts_enabled', 'false');
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $b = $this->behavior($store);
        $this->assertFalse($b['customer_accounts_enabled'], 'master off must be respected');

        // Register should be blocked
        $c = new \App\Http\Controllers\Store\AuthController();
        $req = $this->reqForStore($store, 'POST', '/register', [
            'first_name' => 'A', 'last_name' => 'B',
            'email' => 'blocked@test.com', 'password' => 'Password123!',
            'password_confirmation' => 'Password123!', 'phone' => '+970599000001',
        ]);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        $c->register($req, $store->slug);
    }

    // ── Frontend: TemplateEditorController behavior includes verification ──

    public function test_editor_controller_verification_none(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', 'none');

        $c = new \App\Http\Controllers\Api\TemplateEditorController();
        $m = new \ReflectionMethod($c, 'getBehavior');
        $m->setAccessible(true);
        $b = $m->invoke($c, $store);

        $this->assertEquals('none', $b['customer_verification_method']);
    }

    private function connectStoreMail(Store $store): void
    {
        \App\Services\StoreMailService::updateConfig($store, [
            'host' => 'smtp.example.test', 'port' => '587',
            'username' => 'shop@example.com', 'password' => 'secret123',
            'encryption' => 'tls', 'from_address' => 'noreply@example.com',
            'from_name' => $store->name,
        ]);
        \App\Services\StoreMailService::setStatus($store, \App\Services\StoreMailService::STATUS_CONNECTED);
    }
}
