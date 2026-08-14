<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PlanAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Permissions and roles are normally seeded for the whole application,
        // so reproduce that state before testing role-gated routes.
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function companyUser(array $attributes = []): User
    {
        return User::factory()->create(['type' => 'company'] + $attributes)
            ->assignRole('company');
    }

    public function test_superadmin_has_full_access()
    {
        $superadmin = User::factory()->create(['type' => 'superadmin']);
        
        $response = $this->actingAs($superadmin)->get('/dashboard');
        
        $response->assertStatus(200);
    }

    public function test_company_user_without_plan_redirects_to_plans()
    {
        $company = $this->companyUser(['plan_id' => null]);
        
        $response = $this->actingAs($company)->get('/stores');
        
        $response->assertRedirect('/plans');
    }

    public function test_company_user_with_expired_plan_redirects_to_plans()
    {
        $plan = Plan::factory()->create();
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->subDay(),
            'is_trial' => 0
        ]);
        
        $response = $this->actingAs($company)->get('/dashboard');
        
        $response->assertRedirect('/plans');
    }

    public function test_company_user_with_expired_trial_redirects_to_plans()
    {
        $plan = Plan::factory()->create();
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'is_trial' => 1,
            'trial_expire_date' => now()->subDay()
        ]);
        
        $response = $this->actingAs($company)->get('/dashboard');
        
        $response->assertRedirect('/plans');
    }

    public function test_company_user_with_active_trial_has_access()
    {
        $plan = Plan::factory()->create();
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'is_trial' => 1,
            'trial_expire_date' => now()->addDays(5),
            'onboarded_at' => now()
        ]);
        
        $response = $this->actingAs($company)->get('/dashboard');
        
        $response->assertStatus(200);
    }

    public function test_non_company_user_denied_access()
    {
        $plan = Plan::factory()->create();
        $company = $this->companyUser([
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->subDay(),
            'is_trial' => 0
        ]);
        $user = User::factory()->create([
            'type' => 'user',
            'created_by' => $company->id,
        ]);
        
        $response = $this->actingAs($user)->get('/dashboard');
        
        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_plans_page_accessible_without_plan()
    {
        $company = $this->companyUser(['plan_id' => null]);
        
        $response = $this->actingAs($company)->get('/plans');
        
        $response->assertStatus(200);
    }

    public function test_settings_page_requires_plan()
    {
        $company = $this->companyUser(['plan_id' => null]);
        
        $response = $this->actingAs($company)->get('/settings');
        
        $response->assertRedirect('/plans');
    }

    public function test_dashboard_requires_plan()
    {
        $company = $this->companyUser(['plan_id' => null]);
        
        $response = $this->actingAs($company)->get('/dashboard');
        
        $response->assertRedirect('/plans');
    }

    public function test_examples_require_plan()
    {
        $company = $this->companyUser(['plan_id' => null]);
        
        $response = $this->actingAs($company)->get('/media-library');
        
        $response->assertRedirect('/plans');
    }
}
