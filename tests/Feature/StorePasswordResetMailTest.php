<?php

namespace Tests\Feature;

use App\Mail\CustomerPasswordResetMail;
use App\Models\Customer;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\StoreMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class StorePasswordResetMailTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name' => 'P'.uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'TStore';
        $store->slug = $attrs['slug'] ?? 'tstore-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        if (isset($attrs['custom_domain'])) {
            $store->custom_domain = $attrs['custom_domain'];
            $store->enable_custom_domain = true;
        }
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function connectMail(Store $store, string $host, string $from): void
    {
        StoreMailService::updateConfig($store, [
            'host' => $host,
            'port' => '587',
            'username' => 'shop@example.com',
            'password' => 'secret123',
            'encryption' => 'tls',
            'from_address' => $from,
            'from_name' => $store->name,
        ]);
        StoreMailService::setStatus($store, StoreMailService::STATUS_CONNECTED);
    }

    private function makeCustomer(Store $store, string $email, string $password = 'OldPass123!'): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'C',
            'last_name' => 'D',
            'email' => $email,
            'password' => Hash::make($password),
            'phone' => '+1',
            'is_active' => true,
        ]);
    }

    private function uniqueSlug(string $prefix): string
    {
        return strtolower($prefix.'-'.substr(md5(uniqid()), 0, 10));
    }

    private function storeHost(Store $store): string
    {
        return $store->slug.'.'.config('app.store_domain', 'localhost');
    }

    private function forgotOn(Store $store, string $email): \Illuminate\Testing\TestResponse
    {
        $host = $this->storeHost($store);
        return $this->withServerVariables(['HTTP_HOST' => $host])
            ->post('http://'.$host.'/forgot-password', ['email' => $email]);
    }

    private function applyReset(Store $store, string $email, string $token, string $password): \Illuminate\Testing\TestResponse
    {
        $host = $this->storeHost($store);
        return $this->withServerVariables(['HTTP_HOST' => $host])
            ->post('http://'.$host.'/reset-password', [
                'token' => $token,
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $password,
            ]);
    }

    private function seedForgotToken(Store $store, string $email): string
    {
        $raw = Str::random(60);
        DB::table('store_password_reset_tokens')->insert([
            'email' => $email,
            'store_id' => $store->id,
            'token' => Hash::make($raw),
            'created_at' => now(),
        ]);
        return $raw;
    }

    private function genericSentMsg(): string
    {
        return __('Password reset link sent to your email.');
    }

    public function test_password_reset_uses_store_owned_mail(): void
    {
        Mail::fake();
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('mail-a')]);
        $this->connectMail($s, 'smtp-a.test', 'shop-a@example.com');
        $this->makeCustomer($s, 'customer-a@example.com');

        $res = $this->forgotOn($s, 'customer-a@example.com');

        $res->assertStatus(302);
        $res->assertSessionHas('success', $this->genericSentMsg());
        $res->assertSessionHasNoErrors();
        Mail::assertSent(CustomerPasswordResetMail::class);
        $this->assertEquals('shop-a@example.com', config('mail.from.address'));
        $this->assertEquals('smtp-a.test', config('mail.mailers.smtp.host'));
    }

    public function test_no_platform_fallback_when_store_mail_missing(): void
    {
        Mail::fake();
        // Simulate a real platform/env mailer (production Wusool SMTP) being present.
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'platform-smtp.test',
            'mail.mailers.smtp.port' => 587,
            'mail.mailers.smtp.username' => 'platform@wusool.test',
            'mail.mailers.smtp.password' => 'platform-secret',
            'mail.from.address' => 'no-reply@wusool.ps',
            'mail.from.name' => 'Wusool',
        ]);
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('nofb')]);
        $this->makeCustomer($s, 'nofallback@example.com');

        $res = $this->forgotOn($s, 'nofallback@example.com');

        $res->assertStatus(302);
        $res->assertSessionHas('success', $this->genericSentMsg());
        $res->assertSessionHasNoErrors();
        Mail::assertNothingSent();
    }

    public function test_store_a_b_mail_configs_isolated(): void
    {
        Mail::fake();
        [$u1, $s1] = $this->ownerWithStore(['slug' => $this->uniqueSlug('iso-a')]);
        [$u2, $s2] = $this->ownerWithStore(['slug' => $this->uniqueSlug('iso-b')]);
        $this->connectMail($s1, 'smtp-a.test', 'shop-a@example.com');
        $this->connectMail($s2, 'smtp-b.test', 'shop-b@example.com');
        $this->makeCustomer($s1, 'customer-a@example.com');
        $this->makeCustomer($s2, 'customer-b@example.com');

        $this->forgotOn($s1, 'customer-a@example.com')->assertStatus(302);
        $this->assertEquals('smtp-a.test', config('mail.mailers.smtp.host'));
        $this->assertEquals('shop-a@example.com', config('mail.from.address'));

        $this->forgotOn($s2, 'customer-b@example.com')->assertStatus(302);
        $this->assertEquals('smtp-b.test', config('mail.mailers.smtp.host'));
        $this->assertEquals('shop-b@example.com', config('mail.from.address'));

        Mail::assertSent(CustomerPasswordResetMail::class, 2);
    }

    public function test_unknown_and_known_emails_get_identical_generic_response(): void
    {
        Mail::fake();
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('gen')]);
        $this->connectMail($s, 'smtp-a.test', 'shop-a@example.com');
        $this->makeCustomer($s, 'known@example.com');

        $unknown = $this->forgotOn($s, 'nobody@example.com');
        $unknown->assertStatus(302);
        $unknown->assertSessionHas('success', $this->genericSentMsg());
        $unknown->assertSessionHasNoErrors();

        $known = $this->forgotOn($s, 'known@example.com');
        $known->assertStatus(302);
        $known->assertSessionHas('success', $this->genericSentMsg());
        $known->assertSessionHasNoErrors();

        $this->assertSame($unknown->status(), $known->status());
        $this->assertSame($this->genericSentMsg(), $known->getSession()->get('success'));
    }

    public function test_missing_mail_returns_generic_response_like_unknown_email(): void
    {
        Mail::fake();
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'platform-smtp.test',
            'mail.mailers.smtp.username' => 'platform@wusool.test',
            'mail.mailers.smtp.password' => 'x',
            'mail.from.address' => 'no-reply@wusool.ps',
            'mail.from.name' => 'Wusool',
        ]);
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('miss')]);
        $this->makeCustomer($s, 'miss@example.com');

        $missing = $this->forgotOn($s, 'miss@example.com');
        $missing->assertStatus(302);
        $missing->assertSessionHas('success', $this->genericSentMsg());
        $missing->assertSessionHasNoErrors();

        $unknown = $this->forgotOn($s, 'nobody@example.com');
        $unknown->assertStatus(302);
        $unknown->assertSessionHas('success', $this->genericSentMsg());
        $unknown->assertSessionHasNoErrors();

        $this->assertSame($this->genericSentMsg(), $missing->getSession()->get('success'));
        $this->assertSame($this->genericSentMsg(), $unknown->getSession()->get('success'));
        Mail::assertNothingSent();
    }

    public function test_reset_token_remains_store_scoped(): void
    {
        Mail::fake();
        [$u1, $s1] = $this->ownerWithStore(['slug' => $this->uniqueSlug('tok-a')]);
        [$u2, $s2] = $this->ownerWithStore(['slug' => $this->uniqueSlug('tok-b')]);
        $this->connectMail($s1, 'smtp-a.test', 'shop-a@example.com');
        $this->makeCustomer($s1, 'token@example.com');

        $this->forgotOn($s1, 'token@example.com')->assertStatus(302);

        $row = DB::table('store_password_reset_tokens')
            ->where('email', 'token@example.com')
            ->where('store_id', $s1->id)
            ->first();
        $this->assertNotNull($row);
        $this->assertSame(60, strlen($row->token));
        $this->assertStringStartsWith('$2y$', $row->token, 'token must be stored hashed');
        $this->assertEquals(0, DB::table('store_password_reset_tokens')
            ->where('email', 'token@example.com')
            ->where('store_id', $s2->id)
            ->count());
    }

    public function test_cross_store_reset_token_rejected(): void
    {
        [$u1, $s1] = $this->ownerWithStore(['slug' => $this->uniqueSlug('x-a')]);
        [$u2, $s2] = $this->ownerWithStore(['slug' => $this->uniqueSlug('x-b')]);
        $c1 = $this->makeCustomer($s1, 'cross@example.com');
        $c2 = $this->makeCustomer($s2, 'cross@example.com');
        $raw = $this->seedForgotToken($s1, 'cross@example.com');

        $res = $this->applyReset($s2, 'cross@example.com', $raw, 'NewPass123!');

        $res->assertSessionHasErrors('token');
        $this->assertTrue(Hash::check('OldPass123!', $c1->fresh()->password));
        $this->assertTrue(Hash::check('OldPass123!', $c2->fresh()->password));
    }

    public function test_reset_link_uses_correct_store_subdomain_domain(): void
    {
        Mail::fake();
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('dom')]);
        $this->connectMail($s, 'smtp-a.test', 'shop-a@example.com');
        $this->makeCustomer($s, 'dom@example.com');

        $this->forgotOn($s, 'dom@example.com')->assertStatus(302);

        Mail::assertSent(CustomerPasswordResetMail::class, function ($mail) use ($s) {
            $html = $mail->render();
            $this->assertStringContainsString(
                'http://'.$s->slug.'.'.config('app.store_domain', 'localhost').'/reset-password/',
                $html,
                'reset link must point at the store subdomain',
            );
            $this->assertStringNotContainsString(config('app.url'), $html, 'reset link must never point at APP_URL');
            return true;
        });
    }

    public function test_reset_link_uses_custom_domain_when_configured(): void
    {
        Mail::fake();
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('cd'), 'custom_domain' => 'shop.example.com']);
        $this->connectMail($s, 'smtp-a.test', 'shop-a@example.com');
        $this->makeCustomer($s, 'cd@example.com');

        $this->forgotOn($s, 'cd@example.com')->assertStatus(302);

        Mail::assertSent(CustomerPasswordResetMail::class, function ($mail) {
            $html = $mail->render();
            $this->assertStringContainsString('http://shop.example.com/reset-password/', $html, 'custom domain store must get its own reset link');
            $this->assertStringNotContainsString('.localhost/reset-password/', $html, 'custom domain store must not get a subdomain reset link');
            return true;
        });
    }

    public function test_successful_reset_changes_only_intended_customer_password(): void
    {
        [$u1, $s1] = $this->ownerWithStore(['slug' => $this->uniqueSlug('r-a')]);
        [$u2, $s2] = $this->ownerWithStore(['slug' => $this->uniqueSlug('r-b')]);
        $target = $this->makeCustomer($s1, 'reset@example.com');
        $otherA = $this->makeCustomer($s1, 'other-a@example.com');
        $sameEmailInB = $this->makeCustomer($s2, 'reset@example.com');
        $raw = $this->seedForgotToken($s1, 'reset@example.com');

        $res = $this->applyReset($s1, 'reset@example.com', $raw, 'NewPass123!');

        $res->assertSessionHasNoErrors();
        $res->assertSessionHas('success', __('Password has been reset successfully.'));
        $this->assertTrue(Hash::check('NewPass123!', $target->fresh()->password));
        $this->assertTrue(Hash::check('OldPass123!', $otherA->fresh()->password), 'other customer in same store must stay untouched');
        $this->assertTrue(Hash::check('OldPass123!', $sameEmailInB->fresh()->password), 'same-email customer in store B must stay untouched');
        $this->assertEquals(0, DB::table('store_password_reset_tokens')
            ->where('email', 'reset@example.com')
            ->where('store_id', $s1->id)
            ->count());
    }

    public function test_token_cannot_be_reused(): void
    {
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('reuse')]);
        $customer = $this->makeCustomer($s, 'reuse@example.com');
        $raw = $this->seedForgotToken($s, 'reuse@example.com');

        $first = $this->applyReset($s, 'reuse@example.com', $raw, 'NewPass123!');
        $first->assertSessionHasNoErrors();

        $second = $this->applyReset($s, 'reuse@example.com', $raw, 'Another123!');
        $second->assertSessionHasErrors('token');
        $this->assertTrue(Hash::check('NewPass123!', $customer->fresh()->password));
    }

    public function test_token_expiry_preserved(): void
    {
        [$u, $s] = $this->ownerWithStore(['slug' => $this->uniqueSlug('exp')]);
        $customer = $this->makeCustomer($s, 'exp@example.com');
        $raw = Str::random(60);
        DB::table('store_password_reset_tokens')->insert([
            'email' => 'exp@example.com',
            'store_id' => $s->id,
            'token' => Hash::make($raw),
            'created_at' => now()->subMinutes(61),
        ]);

        $res = $this->applyReset($s, 'exp@example.com', $raw, 'NewPass123!');

        $res->assertSessionHasErrors('token');
        $this->assertTrue(Hash::check('OldPass123!', $customer->fresh()->password));
    }
}