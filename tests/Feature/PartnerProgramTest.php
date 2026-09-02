<?php

namespace Tests\Feature;

use App\Models\Currency;
use App\Models\Partner;
use App\Models\Plan;
use App\Models\Referral;
use App\Models\Store;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Wusool Partner / Agency program (Phase 1) — foundation tests.
 *
 * Covers: partner application, approval, referral attribution, tenant
 * isolation, store privacy, anti-abuse and the "no fabricated commission"
 * product rule.
 */
class PartnerProgramTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Currency::create(['name' => 'US Dollar', 'code' => 'usd', 'symbol' => '$']);
    }

    private function makePlan(): Plan
    {
        return Plan::factory()->create([
            'name' => 'PartnerPro-' . uniqid(),
            'price' => 99,
            'yearly_price' => 990,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 1000,
            'max_users_per_store' => 10,
            'is_default' => false,
        ]);
    }

    private function companyUser(array $overrides = []): User
    {
        $plan = $this->makePlan();

        return User::factory()->create(array_merge([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ], $overrides));
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create(['type' => 'superadmin', 'email_verified_at' => now()]);
        $user->assignRole('superadmin');

        return $user;
    }

    private function makeStore(User $owner, array $overrides = []): Store
    {
        $store = new Store();
        $store->user_id = $owner->id;
        $store->name = $overrides['name'] ?? 'Store ' . uniqid();
        $store->slug = $overrides['slug'] ?? 'store-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@' . uniqid() . '.com';
        if (array_key_exists('partner_id', $overrides)) {
            $store->partner_id = $overrides['partner_id'];
        }
        $store->save();

        return $store;
    }

    private function makePartner(string $status = Partner::STATUS_APPROVED): Partner
    {
        $user = $this->companyUser();

        $partner = new Partner();
        $partner->user_id = $user->id;
        $partner->company_name = 'Agency ' . uniqid();
        $partner->contact_person = 'Contact';
        $partner->email = 'partner@' . uniqid() . '.com';
        $partner->phone = '+970590000000';
        $partner->business_type = 'web-agency';
        $partner->referral_code = Partner::generateReferralCode();
        $partner->status = $status;
        $partner->save();

        return $partner;
    }

    private function validRegistrationPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Merchant User',
            'email' => 'merchant_' . uniqid() . '@example.com',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'terms' => '1',
        ], $overrides);
    }

    private function registerWithReferral(array $payload): User
    {
        $this->withSession(['otp_verified_' . strtolower($payload['email']) => true])
            ->post('/register', $payload);

        return User::where('email', $payload['email'])->first();
    }

    private function validOnboardingPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Merchant Owner',
            'store_name' => 'Partner Store',
            'store_subdomain' => 'partner-store-' . uniqid(),
            'language' => 'ar',
            'currency' => 'usd',
            'theme' => 'bazaar-market',
            'store_email' => 'owner@example.com',
            'store_description' => 'A store',
            'welcome_message' => 'Welcome',
            'whatsapp_enabled' => false,
            'whatsapp_phone' => '',
            'address' => 'Gaza',
            'city' => 'Gaza',
            'country' => 'PS',
            'logo' => '',
            'timezone' => 'Asia/Gaza',
            'publish_store' => true,
            'import_demo_products' => false,
        ], $overrides);
    }

    public function test_partner_application_works(): void
    {
        $user = $this->companyUser();
        $this->actingAs($user);

        $this->post(route('partner.apply.store'), [
            'company_name' => 'Creative Studio',
            'contact_person' => 'John',
            'email' => 'studio@example.com',
            'phone' => '+970590000000',
            'business_type' => 'web-agency',
        ])->assertRedirect(route('partner.dashboard'));

        $partner = Partner::where('user_id', $user->id)->first();

        $this->assertNotNull($partner);
        $this->assertSame(Partner::STATUS_PENDING, $partner->status);
        $this->assertNotEmpty($partner->referral_code);
        $this->assertSame('Creative Studio', $partner->company_name);
    }

    public function test_normal_merchant_is_not_automatically_a_partner(): void
    {
        $user = $this->companyUser();
        $this->assertNull($user->partner);

        $this->actingAs($user);
        $this->get(route('partner.apply'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/apply')
                ->where('partner', null));
    }

    public function test_referral_code_is_unique(): void
    {
        $a = $this->makePartner();
        $b = $this->makePartner();
        $c = $this->makePartner();

        $codes = array_unique([$a->referral_code, $b->referral_code, $c->referral_code]);

        $this->assertCount(3, $codes);
        $this->assertNotEquals($a->referral_code, $b->referral_code);
    }

    public function test_valid_referral_is_persisted_and_attributed_to_store(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        $payload = $this->validRegistrationPayload(['referral_code' => $partner->referral_code]);
        $merchant = $this->registerWithReferral($payload);

        // Server-side persisted, not derived from any editable frontend value.
        $this->assertSame($partner->id, $merchant->partner_id);
        // Partner attribution is a separate mechanic from the legacy
        // user-code referral: the partner's opaque code must NOT trigger the
        // legacy referral bookkeeping.
        $this->assertEmpty($merchant->used_referral_code);

        // Completing onboarding creates the attributed store.
        $this->actingAs($merchant);
        $this->post(route('onboarding.store'), $this->validOnboardingPayload([
            'store_subdomain' => 'attributed-' . uniqid(),
        ]));

        $store = Store::where('user_id', $merchant->id)->first();

        $this->assertNotNull($store);
        $this->assertSame((int) $partner->id, (int) $store->partner_id);
    }

    public function test_invalid_referral_is_ignored_safely(): void
    {
        $merchant = $this->registerWithReferral(
            $this->validRegistrationPayload(['referral_code' => 'MADEUP99'])
        );

        $this->assertNull($merchant->partner_id);
        $this->assertEmpty($merchant->used_referral_code);
    }

    public function test_pending_referral_code_does_not_attribute(): void
    {
        $partner = $this->makePartner(Partner::STATUS_PENDING);

        $merchant = $this->registerWithReferral(
            $this->validRegistrationPayload(['referral_code' => $partner->referral_code])
        );

        $this->assertNull($merchant->partner_id);
        $this->assertEmpty($merchant->used_referral_code);
    }

    public function test_attribution_cannot_be_changed_by_request_tampering(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        // The client cannot force another partner_id onto the account; only a
        // matching approved partner referral code (server-resolved) attributes.
        $merchant = $this->registerWithReferral(
            $this->validRegistrationPayload(['partner_id' => $partner->id])
        );

        $this->assertNull($merchant->partner_id);
        $this->assertEmpty($merchant->used_referral_code);
    }

    public function test_partner_a_cannot_see_partner_b_referrals(): void
    {
        $partnerA = $this->makePartner(Partner::STATUS_APPROVED);
        $partnerB = $this->makePartner(Partner::STATUS_APPROVED);

        $merchantA = $this->companyUser(['partner_id' => $partnerA->id]);
        $storeA = $this->makeStore($merchantA, ['partner_id' => $partnerA->id]);

        $merchantB = $this->companyUser(['partner_id' => $partnerB->id]);
        $storeB = $this->makeStore($merchantB, ['partner_id' => $partnerB->id]);

        $this->actingAs($partnerA->user);

        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->has('referredStores', 1)
                ->where('referredStores.0.id', $storeA->id));

        $this->assertDatabaseHas('stores', ['id' => $storeA->id, 'partner_id' => $partnerA->id]);
        $this->assertDatabaseHas('stores', ['id' => $storeB->id, 'partner_id' => $partnerB->id]);
    }

    public function test_partner_cannot_see_referred_store_orders_or_customers(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);
        $merchant = $this->companyUser(['partner_id' => $partner->id]);
        $store = $this->makeStore($merchant, ['partner_id' => $partner->id]);

        $this->actingAs($partner->user);

        // Dashboard props contain only store identity + activation state.
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->where('referredStores.0.name', $store->name)
                ->missing('orders')
                ->missing('customers')
                ->missing('revenue'));

        // Referral never grants store-side access: no mutation/read routes for
        // the referred store exist under the partner account scope, and the
        // merchant dashboard scoping must not include it.
        $scoped = resolveStoreQuery($partner->user)->where('id', $store->id)->exists();
        $this->assertFalse($scoped);
        $this->assertFalse((int) $partner->user->current_store === (int) $store->id);
    }

    public function test_partner_cannot_change_referred_store(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);
        $merchant = $this->companyUser(['partner_id' => $partner->id]);
        $store = $this->makeStore($merchant, ['partner_id' => $partner->id]);

        $this->actingAs($partner->user);

        $response = $this->put(route('stores.update', $store->id), [
            'name' => 'Hacked Store',
        ]);

        // Not owner, not in the partner's store scope → rejected/redirected.
        $this->assertContains($response->getStatusCode(), [302, 403, 404]);
        $this->assertSame($store->fresh()->name, $store->name);
    }

    public function test_admin_can_approve_partner_application(): void
    {
        $super = $this->superAdmin();
        $partner = $this->makePartner(Partner::STATUS_PENDING);

        $this->actingAs($super);

        $this->get(route('partner.admin'))->assertOk();

        $this->post(route('partner.approve', $partner->id))
            ->assertRedirect();

        $this->assertSame(Partner::STATUS_APPROVED, $partner->fresh()->status);
        $this->assertNotNull($partner->fresh()->approved_at);
    }

    public function test_normal_merchant_cannot_access_partner_admin(): void
    {
        $merchant = $this->companyUser();
        $this->actingAs($merchant);

        $this->get(route('partner.admin'))->assertRedirect();
    }

    public function test_suspended_partner_restrictions_are_enforced(): void
    {
        $partner = $this->makePartner(Partner::STATUS_SUSPENDED);
        $merchant = $this->companyUser(['partner_id' => $partner->id]);
        $this->makeStore($merchant, ['partner_id' => $partner->id]);

        // A suspended partner's code no longer attributes new merchants.
        $newMerchant = $this->registerWithReferral(
            $this->validRegistrationPayload(['referral_code' => $partner->referral_code])
        );
        $this->assertNull($newMerchant->partner_id);
        $this->assertEmpty($newMerchant->used_referral_code);

        // Suspended partner sees no referred stores on the dashboard.
        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->where('referredStores', [])
                ->where('stats.referredStores', 0));

        // Reinstated partner attributes again and sees their referred store.
        $super = $this->superAdmin();
        $this->actingAs($super);
        $this->post(route('partner.reinstate', $partner->id));

        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('referredStores', 1)
                ->where('stats.referredStores', 1)
                ->where('stats.activatedStores', 1));
    }

    public function test_store_registration_works_without_referral(): void
    {
        $merchant = $this->registerWithReferral($this->validRegistrationPayload());

        $this->assertNull($merchant->partner_id);
        $this->assertEmpty($merchant->used_referral_code);

        $this->actingAs($merchant);
        $this->post(route('onboarding.store'), $this->validOnboardingPayload([
            'store_subdomain' => 'noref-' . uniqid(),
        ]));

        $store = Store::where('user_id', $merchant->id)->first();

        $this->assertNotNull($store);
        $this->assertNull($store->partner_id);
    }

    public function test_referral_does_not_break_normal_onboarding(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);
        $merchant = $this->registerWithReferral(
            $this->validRegistrationPayload(['referral_code' => $partner->referral_code])
        );

        $this->actingAs($merchant);
        $response = $this->post(route('onboarding.store'), $this->validOnboardingPayload([
            'store_subdomain' => 'onboard-' . uniqid(),
        ]));

        $response->assertStatus(200);
        $this->assertNotNull($merchant->fresh()->onboarded_at);

        $store = Store::where('user_id', $merchant->id)->first();
        $this->assertSame((int) $partner->id, (int) $store->partner_id);
        $this->assertSame('Partner Store', $store->name);
    }

    public function test_no_commission_amount_is_fabricated(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        // Merchant has not completed onboarding yet: dashboard must report the
        // referred store as present but NOT activated — activation state is
        // derived, never invented.
        $merchant = $this->companyUser(['partner_id' => $partner->id, 'onboarded_at' => null]);
        $this->makeStore($merchant, ['partner_id' => $partner->id]);

        // No financial ledger / commission records are produced by attribution.
        $this->assertSame(0, Referral::count());

        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->missing('earnings')
                ->missing('commission')
                ->missing('balance')
                ->where('stats.referredStores', 1)
                ->where('stats.activatedStores', 0));
    }

    public function test_attribution_works_through_the_primary_otp_registration_flow(): void
    {
        Mail::fake();
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        $email = 'otp_' . uniqid() . '@example.com';

        // Step 1: OTP send stores the pending registration (with referral).
        $this->post(route('otp.send'), [
            'name' => 'OTP User',
            'email' => $email,
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'terms' => '1',
            'referral_code' => $partner->referral_code,
        ])->assertStatus(200);

        // Step 2: OTP verify creates the account with the server-resolved
        // partner attribution (mirrors the fallback /register route).
        $code = VerificationCode::where('email', $email)->firstOrFail()->code;
        $this->post(route('otp.verify'), ['email' => $email, 'code' => $code])
            ->assertStatus(200);

        $merchant = User::where('email', $email)->firstOrFail();

        $this->assertSame($partner->id, $merchant->partner_id);
        $this->assertEmpty($merchant->used_referral_code);
        // Attribution alone must not fabricate commission/ledger records.
        $this->assertSame(0, Referral::count());
    }

    public function test_same_user_cannot_submit_multiple_applications(): void
    {
        $user = $this->companyUser();
        $this->makePartnerForUser($user, Partner::STATUS_PENDING);

        $this->actingAs($user);
        $this->post(route('partner.apply.store'), [
            'company_name' => 'Second Agency',
            'contact_person' => 'John',
            'email' => 'second@example.com',
            'business_type' => 'freelancer',
        ])->assertSessionHasErrors();

        $this->assertSame(1, Partner::where('user_id', $user->id)->count());
    }

    private function makePartnerForUser(User $user, string $status): Partner
    {
        $partner = new Partner();
        $partner->user_id = $user->id;
        $partner->company_name = 'Existing Agency';
        $partner->contact_person = 'Contact';
        $partner->email = 'existing@example.com';
        $partner->business_type = 'agency';
        $partner->referral_code = Partner::generateReferralCode();
        $partner->status = $status;
        $partner->save();

        return $partner;
    }

    public function test_pending_partner_sees_pending_state_on_apply_page(): void
    {
        $partner = $this->makePartner(Partner::STATUS_PENDING);

        $this->actingAs($partner->user);
        $this->get(route('partner.apply'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/apply')
                ->where('partner.status', Partner::STATUS_PENDING)
                ->where('partner.id', $partner->id));
    }

    public function test_approved_partner_can_access_dashboard(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->where('partner.status', Partner::STATUS_APPROVED)
                ->where('partner.referral_link', route('register', ['ref' => $partner->referral_code])));
    }

    public function test_pending_partner_can_access_dashboard_and_sees_no_financials(): void
    {
        // Current rules do NOT gate the dashboard on approval: any partner with a
        // profile may open it and see their truthful status, but never any
        // fabricated commission/earnings values.
        $partner = $this->makePartner(Partner::STATUS_PENDING);

        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->where('partner.status', Partner::STATUS_PENDING)
                ->missing('earnings')
                ->missing('commission')
                ->missing('balance'));
    }

    public function test_dashboard_counts_match_stored_attribution(): void
    {
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        $activeMerchant = $this->companyUser(['partner_id' => $partner->id, 'onboarded_at' => now()]);
        $this->makeStore($activeMerchant, ['partner_id' => $partner->id]);
        $this->makeStore($activeMerchant, ['partner_id' => $partner->id]);

        $inactiveMerchant = $this->companyUser(['partner_id' => $partner->id, 'onboarded_at' => null]);
        $this->makeStore($inactiveMerchant, ['partner_id' => $partner->id]);

        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->has('referredStores', 3)
                ->where('stats.referredStores', 3)
                ->where('stats.activatedStores', 2));
    }

    public function test_partner_payload_never_exposes_financial_fields(): void
    {
        // Guarantees the partner dashboard/apply never surface payout/commission
        // concepts that the backend does not implement (no fabricated benefits).
        $partner = $this->makePartner(Partner::STATUS_APPROVED);

        $this->actingAs($partner->user);
        $this->get(route('partner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('partner/dashboard')
                ->missing('earnings')
                ->missing('commission')
                ->missing('commission_amount')
                ->missing('balance')
                ->missing('payout'));

        $this->get(route('partner.apply'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('partner.status', Partner::STATUS_APPROVED)
                ->missing('partner.commission')
                ->missing('partner.balance')
                ->missing('partner.payout'));
    }

    public function test_rejected_partner_cannot_resubmit_application(): void
    {
        // A rejected partner still owns a partner profile linked to their
        // account, and the application route rejects re-submission — so the UX
        // must not advertise a re-apply action that the backend does not allow.
        $partner = $this->makePartner(Partner::STATUS_REJECTED);

        $this->actingAs($partner->user);
        $this->post(route('partner.apply.store'), [
            'company_name' => 'Second Agency',
            'contact_person' => 'John',
            'email' => 'second@example.com',
            'business_type' => 'agency',
        ])->assertSessionHasErrors();

        $this->assertSame(1, Partner::where('user_id', $partner->user_id)->count());
    }
}