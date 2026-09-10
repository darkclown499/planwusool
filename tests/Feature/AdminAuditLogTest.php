<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Partner;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Platform audit trail (P5C-C3): every high-risk superadmin action must be
 * recorded durably, readable only by superadmins, and must never leak
 * credentials/tokens into the log payload.
 */
class AdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        $user = User::forceCreate([
            'name' => 'Super Admin',
            'email' => 'super-admin-'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'type' => 'superadmin',
        ]);

        return $user;
    }

    private function companyUser(array $overrides = []): User
    {
        $plan = Plan::factory()->create();

        return User::forceCreate([
            'name' => 'Merchant',
            'email' => 'merchant-'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_duration' => 'yearly',
            'plan_expire_date' => now()->addYear(),
            'is_trial' => 0,
            'onboarded_at' => now(),
            'status' => 'active',
        ] + $overrides);
    }

    private function partner(User $owner, string $status = 'pending'): Partner
    {
        return Partner::forceCreate([
            'user_id' => $owner->id,
            'referral_code' => strtoupper(substr(md5(uniqid()), 0, 12)),
            'status' => $status,
            'company_name' => 'Partner Co',
            'contact_person' => 'Agent',
            'email' => 'partner-'.uniqid().'@test.com',
        ]);
    }

    // ------------------------------------------------------------------
    // Service behaviour
    // ------------------------------------------------------------------

    public function test_admin_audit_service_logs_action_with_actor_and_request_meta(): void
    {
        $admin = $this->superAdmin();
        $this->actingAs($admin);

        $log = AuditLogService::log(
            action: 'company.delete',
            targetType: 'User',
            targetId: 999,
            companyId: 999,
            metadata: ['company_name' => 'ACME'],
            request: request()
        );

        $this->assertNotNull($log);
        $this->assertDatabaseHas('admin_audit_logs', [
            'id' => $log->id,
            'actor_user_id' => $admin->id,
            'action' => 'company.delete',
            'target_type' => 'User',
            'target_id' => 999,
            'company_id' => 999,
        ]);
        $this->assertSame(['company_name' => 'ACME'], $log->metadata);
    }

    public function test_admin_audit_service_return_null_when_unauthenticated(): void
    {
        $log = AuditLogService::log(action: 'company.delete');

        $this->assertNull($log);
        $this->assertDatabaseCount('admin_audit_logs', 0);
    }

    public function test_admin_audit_service_swallows_db_errors_and_never_throws(): void
    {
        $this->actingAs($this->superAdmin());

        AdminAuditLog::creating(function () {
            throw new \RuntimeException('forced audit write failure');
        });

        $log = AuditLogService::log(action: 'company.delete');

        $this->assertNull($log);
        $this->assertDatabaseCount('admin_audit_logs', 0);
    }

    public function test_admin_audit_get_logs_filters_by_action_and_date_range(): void
    {
        $this->actingAs($this->superAdmin());

        $stamp = fn (string $action, string $when) => DB::table('admin_audit_logs')->insert([
            'actor_user_id' => $this->superAdmin()->id,
            'action' => $action,
            'target_type' => 'User',
            'target_id' => 1,
            'company_id' => 1,
            'ip_address' => '127.0.0.1',
            'created_at' => $when,
            'updated_at' => $when,
        ]);

        $stamp('company.delete', '2026-01-05 10:00:00');
        $stamp('company.delete', '2026-02-10 10:00:00');
        $stamp('user.reset_password', '2026-02-15 10:00:00');

        $byAction = AuditLogService::getLogs(action: 'company.delete');
        $this->assertSame(2, $byAction->total());

        $byRange = AuditLogService::getLogs(startDate: '2026-02-01', endDate: '2026-02-28');
        $this->assertSame(2, $byRange->total());

        $newestFirst = AuditLogService::getLogs();
        $this->assertSame('user.reset_password', $newestFirst->items()[0]->action);
    }

    // ------------------------------------------------------------------
    // Admin diagnostic page authorization
    // ------------------------------------------------------------------

    public function test_superadmin_can_view_audit_logs_page(): void
    {
        $admin = $this->superAdmin();
        $this->actingAs($admin);

        AuditLogService::log(
            action: 'impersonation.start',
            targetType: 'User',
            targetId: 1,
            request: request()
        );

        $this->get(route('admin.audit-logs'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/audit-logs')
                ->has('logs.data', 1)
                ->has('filters')
                ->where('logs.data.0.actor.id', $admin->id)
                ->where('logs.data.0.action', 'impersonation.start'));
    }

    public function test_non_superadmin_cannot_view_audit_logs(): void
    {
        $this->actingAs($this->companyUser());

        $this->from('/')
            ->get(route('admin.audit-logs'))
            ->assertRedirect();
    }

    // ------------------------------------------------------------------
    // Company (merchant) admin actions
    // ------------------------------------------------------------------

    public function test_company_delete_is_audited(): void
    {
        $admin = $this->superAdmin();
        $company = $this->companyUser();
        $this->actingAs($admin);

        $this->from('/companies')
            ->delete(route('companies.destroy', $company))
            ->assertRedirect();

        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'company.delete',
            'actor_user_id' => $admin->id,
            'target_type' => 'User',
            'target_id' => $company->id,
            'company_id' => $company->id,
        ]);

        $log = AdminAuditLog::where('action', 'company.delete')->first();
        $this->assertSame($company->email, $log->metadata['company_email'] ?? null);
    }

    public function test_company_toggle_status_is_audited_with_previous_and_new_status(): void
    {
        $admin = $this->superAdmin();
        $company = $this->companyUser(['status' => 'active']);
        $this->actingAs($admin);

        $this->from('/companies')
            ->put(route('companies.toggle-status', $company))
            ->assertRedirect();

        $log = AdminAuditLog::where('action', 'company.toggle_status')->first();
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->actor_user_id);
        $this->assertSame($company->id, $log->company_id);
        $this->assertSame('active', $log->metadata['previous_status'] ?? null);
        $this->assertSame('inactive', $log->metadata['new_status'] ?? null);
        $this->assertSame('inactive', $company->fresh()->status);
    }

    public function test_company_reset_password_is_audited_without_leaking_password(): void
    {
        $admin = $this->superAdmin();
        $company = $this->companyUser();
        $this->actingAs($admin);

        $newPassword = 'BrandNew!Pass-2026';

        $this->from('/companies')
            ->put(route('companies.reset-password', $company), ['password' => $newPassword])
            ->assertRedirect();

        $log = AdminAuditLog::where('action', 'company.reset_password')->first();
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->actor_user_id);
        $this->assertSame($company->id, $log->company_id);

        $this->assertFalse(array_key_exists('password', $log->metadata));
        $this->assertStringNotContainsString($newPassword, json_encode($log->metadata));
        $this->assertTrue(Hash::check($newPassword, $company->fresh()->password));
    }

    public function test_company_upgrade_plan_is_audited_with_plan_transition(): void
    {
        $admin = $this->superAdmin();
        $oldPlan = Plan::factory()->create(['name' => 'Starter']);
        $company = $this->companyUser();
        $company->forceFill(['plan_id' => $oldPlan->id])->save();
        $newPlan = Plan::factory()->create(['name' => 'Growth']);

        $this->actingAs($admin);

        $this->from('/companies')
            ->put(route('companies.upgrade-plan', $company), ['plan_id' => $newPlan->id])
            ->assertRedirect();

        $log = AdminAuditLog::where('action', 'company.upgrade_plan')->first();
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->actor_user_id);
        $this->assertSame($oldPlan->id, $log->metadata['previous_plan_id'] ?? null);
        $this->assertSame($newPlan->id, $log->metadata['new_plan_id'] ?? null);
        $this->assertSame($company->id, $company->fresh()->id);
        $this->assertSame($newPlan->id, $company->fresh()->plan_id);
    }

    // ------------------------------------------------------------------
    // Impersonation
    // ------------------------------------------------------------------

    public function test_impersonation_start_and_leave_record_superadmin_as_actor(): void
    {
        $admin = $this->superAdmin();
        $company = $this->companyUser();

        $this->actingAs($admin)
            ->get(route('impersonate.start', $company->id))
            ->assertRedirect('/dashboard');

        $startLog = AdminAuditLog::where('action', 'impersonation.start')->first();
        $this->assertNotNull($startLog);
        $this->assertSame($admin->id, $startLog->actor_user_id);
        $this->assertSame($company->id, $startLog->company_id);
        $this->assertSame($company->id, $startLog->target_id);

        $this->actingAs($company)
            ->withSession([
                'impersonated_by' => $admin->id,
                'impersonated_user_id' => $company->id,
            ])
            ->post(route('impersonate.leave'))
            ->assertRedirect('/companies');

        $stopLog = AdminAuditLog::where('action', 'impersonation.stop')->first();
        $this->assertNotNull($stopLog);
        $this->assertSame($admin->id, $stopLog->actor_user_id);
        $this->assertSame($company->id, $stopLog->company_id);
        $this->assertNotSame($company->id, $stopLog->actor_user_id);
    }

    // ------------------------------------------------------------------
    // Plan order approvals (permission-gated paths still audited)
    // ------------------------------------------------------------------

    public function test_plan_order_reject_is_audited(): void
    {
        $admin = $this->superAdmin();
        $company = $this->companyUser();
        $plan = Plan::factory()->create();

        $order = PlanOrder::create([
            'user_id' => $company->id,
            'plan_id' => $plan->id,
            'billing_cycle' => 'yearly',
            'status' => 'pending',
            'payment_method' => 'bank',
            'original_price' => 29.00,
            'final_price' => 29.00,
        ]);

        $this->actingAs($admin)
            ->post(route('plan-orders.reject', $order), ['notes' => 'incomplete proof'])
            ->assertRedirect(route('plan-orders.index'));

        $log = AdminAuditLog::where('action', 'plan_order.reject')->first();
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->actor_user_id);
        $this->assertSame($company->id, $log->company_id);
        $this->assertSame($order->id, $log->target_id);
        $this->assertSame('incomplete proof', $log->metadata['notes'] ?? null);
    }

    public function test_plan_order_approve_is_audited(): void
    {
        $admin = $this->superAdmin();
        $company = $this->companyUser();
        $plan = Plan::factory()->create();

        $order = PlanOrder::create([
            'user_id' => $company->id,
            'plan_id' => $plan->id,
            'billing_cycle' => 'yearly',
            'status' => 'pending',
            'payment_method' => 'bank',
            'original_price' => 29.00,
            'final_price' => 29.00,
        ]);

        $this->actingAs($admin)
            ->post(route('plan-orders.approve', $order))
            ->assertRedirect(route('plan-orders.index'));

        $log = AdminAuditLog::where('action', 'plan_order.approve')->first();
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->actor_user_id);
        $this->assertSame($company->id, $log->company_id);
        $this->assertSame($order->id, $log->target_id);
    }

    // ------------------------------------------------------------------
    // Partner / agency admin actions
    // ------------------------------------------------------------------

    public function test_partner_approve_reject_suspend_reinstate_are_audited(): void
    {
        $admin = $this->superAdmin();

        $pendingPartner = $this->partner($this->companyUser());
        $this->actingAs($admin)
            ->post(route('partner.approve', $pendingPartner))
            ->assertRedirect();
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'partner.approve', 'company_id' => $pendingPartner->user_id]);

        $pendingPartner2 = $this->partner($this->companyUser());
        $this->actingAs($admin)
            ->post(route('partner.reject', $pendingPartner2), ['notes' => 'polish'])
            ->assertRedirect();
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'partner.reject', 'company_id' => $pendingPartner2->user_id]);

        $approved = $this->partner($this->companyUser(), 'approved');
        $this->actingAs($admin)
            ->post(route('partner.suspend', $approved))
            ->assertRedirect();
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'partner.suspend', 'company_id' => $approved->user_id]);

        $suspended = $this->partner($this->companyUser(), 'suspended');
        $this->actingAs($admin)
            ->post(route('partner.reinstate', $suspended))
            ->assertRedirect();
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'partner.reinstate', 'company_id' => $suspended->user_id]);

        $this->assertSame(4, AdminAuditLog::count());
    }

    // ------------------------------------------------------------------
    // Dead-route regression
    // ------------------------------------------------------------------

    public function test_deprecated_plan_orders_create_route_is_removed(): void
    {
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('plan-orders.create'));

        $exists = collect(\Illuminate\Support\Facades\Route::getRoutes())
            ->contains(fn ($route) => str_contains($route->uri(), 'plan-orders') && str_contains($route->uri(), 'create'));

        $this->assertFalse($exists, 'plan-orders/create route must remain removed');
    }
}