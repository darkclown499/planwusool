<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Spatie\Permission\Models\Permission;

class PlatformCourierAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_merchant_blocked(): void
    {
        $company = User::factory()->create(['type'=>'company','email_verified_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$company->id]);
        $company->forceFill(['current_store'=>$store->id])->save();
        $role = Role::firstOrCreate(['name'=>'company','guard_name'=>'web'],['label'=>'Company']);
        $role->syncPermissions(Permission::all());
        $company->assignRole($role);
        $this->actingAs($company);
        $res = $this->getJson('/api/admin/courier-requests');
        $this->assertEquals(403, $res->status());
    }

    public function test_superadmin_allowed(): void
    {
        $super = User::factory()->create(['type'=>'superadmin','email_verified_at'=>now()]);
        $role = Role::firstOrCreate(['name'=>'superadmin','guard_name'=>'web'],['label'=>'Super Admin']);
        $role->syncPermissions(Permission::all());
        $super->assignRole($role);
        $this->actingAs($super);
        $res = $this->getJson('/api/admin/courier-requests');
        $this->assertEquals(200, $res->status());
    }
}
