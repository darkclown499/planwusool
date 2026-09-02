<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Restore store-owner access to the in-store POS.
     *
     * The POS routes (`pos.*`) are gated on `permission:manage-pos`. The
     * `company` role lists those permissions in RoleSeeder, but the permissions
     * themselves were never created, so `whereIn` returned nothing and the role
     * never received them. This migration defines the missing POS permissions
     * and idempotently attaches them to the `company` role (the store owner),
     * without touching any custom/employee roles.
     */
    public function up(): void
    {
        $posPermissions = [
            ['name' => 'manage-pos', 'label' => 'Manage POS', 'description' => 'Can manage in-store point of sale'],
            ['name' => 'view-pos', 'label' => 'View POS', 'description' => 'Can view in-store point of sale'],
            ['name' => 'process-transactions-pos', 'label' => 'Process POS Transactions', 'description' => 'Can process in-store POS transactions'],
            ['name' => 'view-transactions-pos', 'label' => 'View POS Transactions', 'description' => 'Can view in-store POS transactions'],
            ['name' => 'manage-settings-pos', 'label' => 'Manage POS Settings', 'description' => 'Can manage in-store POS settings'],
        ];

        $names = collect($posPermissions)->pluck('name')->all();

        foreach ($posPermissions as $p) {
            Permission::firstOrCreate(
                ['name' => $p['name'], 'guard_name' => 'web'],
                [
                    'module' => 'pos',
                    'label' => $p['label'],
                    'description' => $p['description'],
                ]
            );
        }

        $companyRole = Role::where('name', 'company')->where('guard_name', 'web')->first();
        if ($companyRole) {
            $pos = Permission::whereIn('name', $names)->where('guard_name', 'web')->pluck('name')->all();
            $companyRole->givePermissionTo($pos);
        }
    }

    public function down(): void
    {
        $companyRole = Role::where('name', 'company')->where('guard_name', 'web')->first();
        if ($companyRole) {
            $companyRole->revokePermissionTo([
                'manage-pos',
                'view-pos',
                'process-transactions-pos',
                'view-transactions-pos',
                'manage-settings-pos',
            ]);
        }

        Permission::whereIn('name', [
            'manage-pos',
            'view-pos',
            'process-transactions-pos',
            'view-transactions-pos',
            'manage-settings-pos',
        ])->where('guard_name', 'web')->delete();
    }
};