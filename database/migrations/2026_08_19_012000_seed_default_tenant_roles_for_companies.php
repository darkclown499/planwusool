<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Create the default assignable tenant roles (Store Manager / Staff) for
     * every company account that does not have its own scoped roles yet, so the
     * "Add User" role dropdown is populated for brand-new companies instead of
     * being empty. Roles are scoped to the company via `created_by` so tenants
     * never see each other's roles.
     */
    public function up(): void
    {
        $companies = \App\Models\User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            return;
        }

        $managerPermissions = Permission::whereIn('name', [
            'manage-dashboard',
            'manage-stores', 'view-stores', 'edit-stores',
            'manage-products', 'view-products', 'create-products', 'edit-products', 'delete-products',
            'manage-categories', 'view-categories', 'create-categories', 'edit-categories',
            'manage-orders', 'view-orders', 'edit-orders',
            'manage-customers', 'view-customers', 'edit-customers',
        ])->pluck('name');

        $staffPermissions = Permission::whereIn('name', [
            'manage-dashboard',
            'view-stores',
            'view-products',
            'view-orders',
            'view-customers',
        ])->pluck('name');

        foreach ($companies as $company) {
            $managerRole = Role::firstOrCreate(
                ['name' => 'manager_' . $company->id, 'guard_name' => 'web'],
                [
                    'label' => 'Store Manager',
                    'description' => 'Store Manager has access to manage store operations',
                    'created_by' => $company->id,
                ]
            );
            $managerRole->syncPermissions($managerPermissions);

            $staffRole = Role::firstOrCreate(
                ['name' => 'staff_' . $company->id, 'guard_name' => 'web'],
                [
                    'label' => 'Staff',
                    'description' => 'Staff has read-only access to store data',
                    'created_by' => $company->id,
                ]
            );
            $staffRole->syncPermissions($staffPermissions);
        }
    }

    public function down(): void
    {
        // Intentionally left blank: roles are tenant data, not schema.
    }
};