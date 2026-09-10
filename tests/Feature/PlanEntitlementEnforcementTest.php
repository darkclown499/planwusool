<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use App\Models\Store;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PlanEntitlementEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        // Deterministic AI tests: force the ChatGPT controller down the
        // "no API key configured" path (200 + success=false) instead of
        // attempting a real Gemini/OpenAI call with .env keys.
        \Illuminate\Support\Facades\Config::set('services.gemini.key', null);
        putenv('GEMINI_API_KEY');
        unset($_ENV['GEMINI_API_KEY'], $_SERVER['GEMINI_API_KEY']);
    }

    private function planWith(array $overrides = []): Plan
    {
        return Plan::factory()->create(array_merge([
            'enable_sms' => 'off',
            'enable_chatgpt' => 'off',
            'enable_accounting_integration' => 'off',
            'enable_shipping_method' => 'off',
            'is_trial' => null,
            'trial_day' => 0,
            'is_plan_enable' => 'on',
        ], $overrides));
    }

    private function companyUser(array $overrides = []): User
    {
        $attrs = array_merge([
            'type' => 'company',
            'plan_id' => null,
            'plan_is_active' => 0,
            'is_trial' => 0,
        ], $overrides);

        $type = $attrs['type'];
        unset($attrs['type']);

        $planId = $attrs['plan_id'] ?? null;
        unset($attrs['plan_id']);

        $planIsActive = $attrs['plan_is_active'] ?? 0;
        unset($attrs['plan_is_active']);

        $isTrial = $attrs['is_trial'] ?? 0;
        unset($attrs['is_trial']);

        $planExpireDate = $attrs['plan_expire_date'] ?? null;
        unset($attrs['plan_expire_date']);

        $trialExpireDate = $attrs['trial_expire_date'] ?? null;
        unset($attrs['trial_expire_date']);

        $trialDay = $attrs['trial_day'] ?? 0;
        unset($attrs['trial_day']);

        $user = User::factory()->create($attrs);
        $user->forceFill([
            'type' => $type,
            'plan_id' => $planId,
            'plan_is_active' => $planIsActive,
            'is_trial' => $isTrial,
            'plan_expire_date' => $planExpireDate,
            'trial_expire_date' => $trialExpireDate,
            'trial_day' => $trialDay,
        ])->save();

        $user->assignRole('company');
        return $user;
    }

    // ---------------------------------------------------------------
    //  SMS feature gate
    // ---------------------------------------------------------------

    public function test_sms_settings_denied_without_entitlement()
    {
        $plan = $this->planWith(['enable_sms' => 'off']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($company)->postJson('/settings/twilio', [
            'sms_provider' => 'twilio',
            'is_twilio_enabled' => true,
            'twilio_sid' => 'ACtest123',
            'twilio_token' => 'tokentest',
            'twilio_from' => '+15005550001',
            'is_hotsms_enabled' => false,
        ]);

        $response->assertStatus(403);
        $response->assertJson(['success' => false]);
    }

    public function test_sms_settings_allowed_with_entitlement()
    {
        $plan = $this->planWith(['enable_sms' => 'on']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($company)->postJson('/settings/twilio', [
            'sms_provider' => 'twilio',
            'is_twilio_enabled' => true,
            'twilio_sid' => 'ACtest123',
            'twilio_token' => 'tokentest',
            'twilio_from' => '+15005550001',
            'is_hotsms_enabled' => false,
        ]);

        $response->assertStatus(302);
    }

    public function test_sms_superadmin_bypasses_entitlement()
    {
        $superadmin = User::factory()->create(['type' => 'superadmin']);

        $response = $this->actingAs($superadmin)->postJson('/settings/twilio', [
            'sms_provider' => 'twilio',
            'is_twilio_enabled' => true,
            'twilio_sid' => 'ACtest123',
            'twilio_token' => 'tokentest',
            'twilio_from' => '+15005550001',
            'is_hotsms_enabled' => false,
        ]);

        $response->assertStatus(302);
    }

    // ---------------------------------------------------------------
    //  ChatGPT feature gate
    // ---------------------------------------------------------------

    public function test_chatgpt_generate_denied_without_entitlement()
    {
        $plan = $this->planWith(['enable_chatgpt' => 'off']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($company)->postJson('/api/chatgpt/generate', [
            'prompt' => 'Hello',
        ]);

        $response->assertStatus(403);
        $response->assertJson(['success' => false]);
    }

    public function test_chatgpt_generate_allowed_with_entitlement()
    {
        $plan = $this->planWith(['enable_chatgpt' => 'on']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($company)->postJson('/api/chatgpt/generate', [
            'prompt' => 'Hello',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => false]);
    }

    public function test_chatgpt_superadmin_bypasses_entitlement()
    {
        $superadmin = User::factory()->create(['type' => 'superadmin']);

        $response = $this->actingAs($superadmin)->postJson('/api/chatgpt/generate', [
            'prompt' => 'Hello',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => false]);
    }

    // ---------------------------------------------------------------
    //  Accounting feature gate (StoreErpController — merchant-facing)
    // ---------------------------------------------------------------

    public function test_accounting_store_denied_without_entitlement()
    {
        $plan = $this->planWith(['enable_accounting_integration' => 'off']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);
        // user_id is guarded on Store — use the factory (bypasses mass-assignment protection).
        $store = Store::factory()->create([
            'user_id' => $company->id,
            'name' => 'Test Store',
            'theme' => 'fashion-atelier',
        ]);

        $response = $this->actingAs($company)->postJson("/api/stores/{$store->id}/erp", [
            'provider' => 'accounting',
            'config' => ['base_url' => 'https://example.com', 'api_key' => 'test'],
        ]);

        $response->assertStatus(403);
        $response->assertJson(['success' => false]);
    }

    public function test_accounting_store_allowed_with_entitlement()
    {
        $plan = $this->planWith(['enable_accounting_integration' => 'on']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);
        // user_id is guarded on Store — use the factory (bypasses mass-assignment protection).
        $store = Store::factory()->create([
            'user_id' => $company->id,
            'name' => 'Test Store',
            'theme' => 'fashion-atelier',
        ]);

        $response = $this->actingAs($company)->postJson("/api/stores/{$store->id}/erp", [
            'provider' => 'odoo',
            'api_endpoint' => 'https://demo.example.com/erp',
            'auto_sync_interval' => 'daily',
            'api_key' => 'test-key',
        ]);

        // Must not be blocked by the entitlement gate — a valid request persists (201).
        $response->assertStatus(201);
        $response->assertJson(['success' => true]);
    }

    // ---------------------------------------------------------------
    //  Trial security
    // ---------------------------------------------------------------

    public function test_trial_denied_when_plan_does_not_offer_trial()
    {
        $plan = $this->planWith(['is_trial' => null, 'trial_day' => 0]);
        $company = $this->companyUser([
            'plan_id' => null,
            'plan_is_active' => 0,
        ]);

        $response = $this->actingAs($company)->post('/plans/trial', [
            'plan_id' => $plan->id,
        ]);

        $response->assertSessionHasErrors('error');
    }

    public function test_trial_denied_when_user_already_used_trial()
    {
        $plan = $this->planWith(['is_trial' => 'on', 'trial_day' => 14]);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'is_trial' => 1,
            'plan_is_active' => 0,
        ]);

        $response = $this->actingAs($company)->post('/plans/trial', [
            'plan_id' => $plan->id,
        ]);

        $response->assertSessionHasErrors('error');
    }

    public function test_trial_denied_when_user_has_active_plan()
    {
        $plan = $this->planWith(['is_trial' => 'on', 'trial_day' => 14]);
        $otherPlan = $this->planWith(['is_trial' => 'on', 'trial_day' => 14]);
        $company = $this->companyUser([
            'plan_id' => $otherPlan->id,
            'is_trial' => 0,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($company)->post('/plans/trial', [
            'plan_id' => $plan->id,
        ]);

        $response->assertSessionHasErrors('error');
    }

    public function test_trial_denied_when_plan_not_enabled()
    {
        $plan = $this->planWith(['is_trial' => 'on', 'trial_day' => 14, 'is_plan_enable' => 'off']);
        $company = $this->companyUser([
            'plan_id' => null,
            'plan_is_active' => 0,
        ]);

        $response = $this->actingAs($company)->post('/plans/trial', [
            'plan_id' => $plan->id,
        ]);

        $response->assertSessionHasErrors('error');
    }

    public function test_trial_succeeds_when_all_conditions_met()
    {
        $plan = $this->planWith(['is_trial' => 'on', 'trial_day' => 14]);
        $company = $this->companyUser([
            'plan_id' => null,
            'plan_is_active' => 0,
            'is_trial' => 0,
        ]);

        $response = $this->actingAs($company)->post('/plans/trial', [
            'plan_id' => $plan->id,
        ]);

        $response->assertSessionHas('success');
        $company->refresh();
        $this->assertEquals($plan->id, $company->plan_id);
        $this->assertEquals(1, $company->is_trial);
    }

    // ---------------------------------------------------------------
    //  Subscribe no dead redirect
    // ---------------------------------------------------------------

    public function test_subscribe_free_plan_assigns_directly()
    {
        $plan = $this->planWith(['price' => 0, 'yearly_price' => 0, 'is_plan_enable' => 'on']);
        $company = $this->companyUser([
            'plan_id' => null,
            'plan_is_active' => 0,
        ]);

        $response = $this->actingAs($company)->post('/plans/subscribe', [
            'plan_id' => $plan->id,
            'billing_cycle' => 'yearly',
        ]);

        $response->assertSessionHas('success');
        $company->refresh();
        $this->assertEquals($plan->id, $company->plan_id);
        $this->assertEquals(1, $company->plan_is_active);
    }

    public function test_subscribe_paid_plan_does_not_500()
    {
        $plan = $this->planWith(['price' => 299, 'yearly_price' => 299, 'is_plan_enable' => 'on']);
        $company = $this->companyUser([
            'plan_id' => null,
            'plan_is_active' => 0,
        ]);

        $response = $this->actingAs($company)->post('/plans/subscribe', [
            'plan_id' => $plan->id,
            'billing_cycle' => 'yearly',
        ]);

        $response->assertStatus(302);
        $response->assertRedirect(route('plans.index'));
    }

    // ---------------------------------------------------------------
    //  Dead plan-orders route removed
    // ---------------------------------------------------------------

    public function test_plan_orders_create_route_returns_404()
    {
        $company = $this->companyUser([
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($company)->postJson('/plan-orders', [
            'plan_id' => 1,
        ]);

        $response->assertStatus(404);
    }

    // ---------------------------------------------------------------
    //  featureColumnMap includes sms
    // ---------------------------------------------------------------

    public function test_feature_column_map_includes_sms()
    {
        $map = \App\Http\Middleware\CheckPlanAccess::featureColumnMap();
        $this->assertArrayHasKey('sms', $map);
        $this->assertEquals('enable_sms', $map['sms']);
    }

    // ---------------------------------------------------------------
    //  Tenant isolation — cross-store entitlement leak
    // ---------------------------------------------------------------

    public function test_cross_store_user_cannot_bypass_entitlement()
    {
        $plan = $this->planWith(['enable_chatgpt' => 'off']);
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $otherPlan = $this->planWith(['enable_chatgpt' => 'off']);
        $otherCompany = $this->companyUser([
            'plan_id' => $otherPlan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);

        $response = $this->actingAs($otherCompany)->postJson('/api/chatgpt/generate', [
            'prompt' => 'Hello',
        ]);

        $response->assertStatus(403);
        $response->assertJson(['success' => false]);
    }
}
