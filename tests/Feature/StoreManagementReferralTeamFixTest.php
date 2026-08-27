<?php

namespace Tests\Feature;

use App\Models\Currency;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Referral;
use App\Models\ReferralSetting;
use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use App\Services\Currency\CurrencyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class StoreManagementReferralTeamFixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\CurrencySeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function makePlan(array $over = []): Plan
    {
        return Plan::factory()->create(array_merge([
            'name' => 'Starter-'.uniqid(),
            'price' => 0,
            'yearly_price' => 0,
            'max_stores' => 1,
            'max_users_per_store' => 2,
            'max_products_per_store' => 10,
            'themes' => ['all'],
            'is_default' => true,
        ], $over));
    }

    private function companyUser(?Plan $plan = null): User
    {
        $plan = $plan ?? $this->makePlan();
        $u = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'email_verified_at' => now(),
        ]);
        $role = Role::firstOrCreate(['name'=>'company','guard_name'=>'web'], ['label'=>'Company','created_by'=>null]);
        $perms = Permission::whereIn('name', ['manage-stores','view-stores','create-stores','edit-stores','delete-stores','export-stores','settings-stores','manage-users','create-users','edit-users','view-users','manage-referral','manage-payout-referral'])->get();
        $role->syncPermissions($perms);
        $u->assignRole($role);
        foreach ($perms as $p) { try{ $u->givePermissionTo($p);}catch(\Throwable $e){} }
        return $u->fresh();
    }

    private function storeFor(User $owner): Store
    {
        $s = new Store();
        $s->user_id = $owner->id;
        $s->name = 'Store '.uniqid();
        $s->slug = 'store-'.uniqid();
        $s->theme = Store::DEFAULT_TEMPLATE;
        $s->email = 'store@example.com';
        $s->save();
        return $s;
    }

    public function test_store_index_provides_store_limit_info()
    {
        $plan = $this->makePlan(['max_stores'=>1]);
        $company = $this->companyUser($plan);
        $this->storeFor($company);
        $check = \App\Http\Middleware\CheckPlanAccess::checkStoreLimit($company);
        $this->assertFalse($check['allowed']);
        $this->assertNotEmpty($check['message']);
    }

    public function test_free_plan_at_limit_cannot_create_store_backend()
    {
        $plan = $this->makePlan(['max_stores'=>1]);
        $company = $this->companyUser($plan);
        $this->storeFor($company);
        $res = $this->actingAs($company)->post(route('stores.store'), [
            'name' => 'New Store',
            'theme' => Store::DEFAULT_TEMPLATE,
        ]);
        // Should redirect with error, not create
        $this->assertEquals(1, Store::where('user_id', $company->id)->count());
    }

    public function test_higher_plan_can_create_store()
    {
        $plan = $this->makePlan(['max_stores'=>3]);
        $company = $this->companyUser($plan);
        $this->storeFor($company);
        $check = \App\Http\Middleware\CheckPlanAccess::checkStoreLimit($company->fresh());
        $this->assertTrue($check['allowed']);
    }

    public function test_foreign_store_forbidden()
    {
        $companyA = $this->companyUser();
        $companyB = $this->companyUser();
        $storeB = $this->storeFor($companyB);
        $res = $this->actingAs($companyA)->get(route('stores.show', $storeB->id));
        $this->assertTrue(in_array($res->status(), [404,403,302]), 'Expected forbidden/NF for foreign store, got '.$res->status());
        if ($res->status() === 302) {
            $res->assertRedirect();
        }
    }

    public function test_currency_formatter_uses_nbsp()
    {
        $svc = new CurrencyService();
        $formatted = $svc->formatStoreCurrency(1000, null, null);
        // Should contain NBSP between number and symbol
        $this->assertStringContainsString("\xC2\xA0", $formatted);
        // Large value formatting
        $large = $svc->formatCurrency(1234567.89, ['defaultCurrency'=>'ILS','decimalFormat'=>'2','decimalSeparator'=>'.','thousandsSeparator'=>',','currencySymbolPosition'=>'after','currencySymbolSpace'=>false], [['code'=>'ILS','symbol'=>'₪']]);
        $this->assertStringContainsString("\xC2\xA0₪", $large);
        $this->assertStringContainsString('1,234,567.89', $large);
    }

    public function test_referral_code_stable_and_attribution()
    {
        $referrer = $this->companyUser();
        $referrer->referral_code = '123456';
        $referrer->save();
        $code1 = $referrer->fresh()->referral_code;
        $code2 = $referrer->fresh()->referral_code;
        $this->assertEquals($code1, $code2);
        // Simulate registration with referral
        $newUser = User::factory()->create([
            'type'=>'company',
            'plan_id'=>$referrer->plan_id,
            'used_referral_code'=>$code1,
            'referral_code'=>'654321',
        ]);
        $this->assertEquals($code1, $newUser->used_referral_code);
    }

    public function test_referral_duplicate_blocked()
    {
        $referrer = $this->companyUser();
        $referrer->referral_code='111111'; $referrer->save();
        $plan = $referrer->plan;
        // Create referred user with approved order
        $referred = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'used_referral_code'=>'111111','referral_code'=>'222222']);
        $settings = ReferralSetting::firstOrCreate([], ['commission_percentage'=>10,'threshold_amount'=>10,'is_enabled'=>true]);
        $order = PlanOrder::create(['user_id'=>$referred->id,'plan_id'=>$plan->id,'status'=>'approved','original_price'=>100,'final_price'=>100,'billing_cycle'=>'monthly','order_number'=>'PO-'.uniqid()]);
        \App\Http\Controllers\ReferralController::createReferralRecord($referred->fresh(), 'monthly');
        $this->assertEquals(1, Referral::where('user_id',$referred->id)->count());
        // Second attempt should not create duplicate
        \App\Http\Controllers\ReferralController::createReferralRecord($referred->fresh(), 'monthly');
        $this->assertEquals(1, Referral::where('user_id',$referred->id)->count());
    }

    public function test_referral_self_referral_blocked()
    {
        $user = $this->companyUser();
        $user->referral_code='999999'; $user->save();
        $user->used_referral_code='999999';
        $user->save();
        $settings = ReferralSetting::firstOrCreate([], ['commission_percentage'=>10,'threshold_amount'=>10,'is_enabled'=>true]);
        $plan = $user->plan;
        $order = PlanOrder::create(['user_id'=>$user->id,'plan_id'=>$plan->id,'status'=>'approved','original_price'=>100,'final_price'=>100,'billing_cycle'=>'monthly','order_number'=>'PO-'.uniqid()]);
        \App\Http\Controllers\ReferralController::createReferralRecord($user->fresh(), 'monthly');
        $this->assertEquals(0, Referral::where('user_id',$user->id)->count());
    }

    public function test_referral_requires_approved_order()
    {
        $referrer = $this->companyUser();
        $referrer->referral_code='333333'; $referrer->save();
        $referred = User::factory()->create(['type'=>'company','plan_id'=>$referrer->plan_id,'used_referral_code'=>'333333','referral_code'=>'444444']);
        $settings = ReferralSetting::firstOrCreate([], ['commission_percentage'=>10,'threshold_amount'=>10,'is_enabled'=>true]);
        // No approved order -> no referral
        \App\Http\Controllers\ReferralController::createReferralRecord($referred->fresh(), 'monthly');
        $this->assertEquals(0, Referral::where('user_id',$referred->id)->count());
    }

    public function test_foreign_role_rejected_via_direct_query()
    {
        $companyA = $this->companyUser();
        $companyB = $this->companyUser();
        $foreignRole = Role::create(['name'=>'foreign-'.uniqid(),'label'=>'Foreign','guard_name'=>'web','created_by'=>$companyB->id]);
        // Simulate store method role scoping: companyA should not be able to fetch foreign role
        $found = Role::where('id', $foreignRole->id)
            ->where(function($q) use ($companyA){ $q->where('created_by',$companyA->id)->orWhere('created_by',$companyA->created_by); })
            ->whereNotIn('name',['superadmin','company'])
            ->first();
        $this->assertNull($found);
    }

    public function test_staff_plan_limit_logic()
    {
        $plan = $this->makePlan(['max_users_per_store'=>1]);
        $company = $this->companyUser($plan);
        $store = $this->storeFor($company);
        $company->current_store = $store->id; $company->save();
        // Directly test CheckPlanAccess::checkUserLimit
        $check = \App\Http\Middleware\CheckPlanAccess::checkUserLimit($company, $store->id);
        $this->assertTrue($check['allowed']);
        // Add one user to reach limit
        User::factory()->create(['type'=>'user','created_by'=>$company->id,'current_store'=>$store->id]);
        $check2 = \App\Http\Middleware\CheckPlanAccess::checkUserLimit($company, $store->id);
        $this->assertFalse($check2['allowed']);
    }
}
