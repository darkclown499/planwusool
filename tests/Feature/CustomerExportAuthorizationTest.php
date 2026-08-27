<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Spatie\Permission\Models\Permission;
use App\Models\Role;

class CustomerExportAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function companyWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create(['max_stores'=>10,'max_products_per_store'=>100,'max_users_per_store'=>20]);
        $u = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'plan_id'=>$plan->id,'plan_is_active'=>1,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now()]);
        $s = Store::factory()->create(['user_id'=>$u->id]);
        $u->forceFill(['current_store'=>$s->id])->save();
        $role = Role::firstOrCreate(['name'=>'company','guard_name'=>'web'],['label'=>'Company']);
        $role->syncPermissions(Permission::all());
        $u->assignRole($role);
        foreach (Permission::all() as $p) { try{ $u->givePermissionTo($p);}catch(\Throwable $e){} }
        return [$u->fresh(),$s];
    }

    private function staffWithPerms(User $company, Store $store, array $perms): User
    {
        $user = User::factory()->create(['type'=>'staff','created_by'=>$company->id,'current_store'=>$store->id,'email_verified_at'=>now()]);
        $roleName = 'staff_'.uniqid();
        $role = Role::create(['name'=>$roleName,'guard_name'=>'web','label'=>'Staff','created_by'=>$company->id]);
        if ($perms) {
            $models = Permission::whereIn('name',$perms)->get();
            $role->syncPermissions($models);
            foreach ($models as $m) { try{ $user->givePermissionTo($m);}catch(\Throwable $e){} }
        }
        $user->assignRole($role);
        $user->forceFill(['type'=>$roleName])->save();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        return $user->fresh();
    }

    public function test_unauthorized_staff_blocked(): void
    {
        [$company,$store] = $this->companyWithStore();
        $staff = $this->staffWithPerms($company,$store,['view-customers']); // no export-customers
        $this->actingAs($staff);
        $res = $this->get('/customers/export');
        $this->assertTrue(in_array($res->status(),[403,302]));
    }

    public function test_owner_allowed(): void
    {
        [$company,$store] = $this->companyWithStore();
        Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'a@b.com','is_active'=>true]);
        $this->actingAs($company);
        $res = $this->get('/customers/export');
        $this->assertEquals(200, $res->getStatusCode());
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
    }

    public function test_rate_limit_exists(): void
    {
        [$company,$store] = $this->companyWithStore();
        $this->actingAs($company);
        for ($i=0;$i<6;$i++) $this->get('/customers/export');
        $res = $this->get('/customers/export');
        $this->assertEquals(429, $res->getStatusCode());
    }
}
