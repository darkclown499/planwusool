<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create super admin role
        $superAdminRole = Role::firstOrCreate(
            ['name' => 'superadmin', 'guard_name' => 'web'],
            [
                'label' => 'Super Admin',
                'description' => 'Super Admin has full access to all features',
            ]
        );

        // Create admin role
        $adminRole = Role::firstOrCreate(
            ['name' => 'company', 'guard_name' => 'web'],
            [
                'label' => 'Company',
                'description' => 'Company has access to manage buissness',
            ]
        );

        // Get all permissions
        $permissions = Permission::all();

        // Assign all permissions to super admin
        $superAdminRole->syncPermissions($permissions);

        // Assign specific permissions to company role
        $adminPermissions = Permission::whereIn('name', [
            'manage-dashboard',
            'manage-users',
            'create-users',
            'edit-users',
            'delete-users',
            'view-users',
            'reset-password-users',
            'toggle-status-users',
            'manage-roles',
            'create-roles',
            'edit-roles',
            'delete-roles',
            'view-roles',
            'view-permissions',

            'manage-plans',
            'request-plans',
            'trial-plans',
            'subscribe-plans',
            'manage-plan-requests',
            'manage-plan-orders',
            'manage-settings',
            'manage-payment-settings',
            'manage-webhook-settings',
            'manage-settings',
            'manage-media',
            'upload-media',
            'delete-media',
            'download-media',



            'manage-own-businesses',
            'manage-businesses',
            'view-businesses',
            'create-businesses',
            'edit-businesses',
            'delete-businesses',
            'manage-language',
            'edit-language',
            'view-language',
            
            // Referral Program permissions
            'manage-referral',
            'manage-payout-referral',

            'view-landing-page',
            
            // Store permissions
            'manage-stores',
            'view-stores',
            'create-stores',
            'edit-stores',
            'delete-stores',
            'export-stores',
            'settings-stores',
            
            // Product permissions
            'manage-products',
            'view-products',
            'create-products',
            'edit-products',
            'delete-products',
            'export-products',
            
            // Category permissions
            'manage-categories',
            'view-categories',
            'create-categories',
            'edit-categories',
            'delete-categories',
            'export-categories',
            
            // Tax permissions
            'manage-tax',
            'view-tax',
            'create-tax',
            'edit-tax',
            'delete-tax',
            'export-tax',
            
            // Order permissions
            'manage-orders',
            'view-orders',
            'edit-orders',
            'delete-orders',
            'export-orders',
            
            // Customer permissions
            'manage-customers',
            'view-customers',
            'create-customers',
            'edit-customers',
            'delete-customers',
            'export-customers',
            
            // Coupon System permissions
            'manage-coupon-system',
            'view-coupon-system',
            'create-coupon-system',
            'edit-coupon-system',
            'delete-coupon-system',
            'export-coupon-system',
            'toggle-status-coupon-system',
            
            // Shipping permissions
            'manage-shipping',
            'view-shipping',
            'create-shipping',
            'edit-shipping',
            'delete-shipping',
            'export-shipping',
            
            // Analytics permissions
            'manage-analytics',
            'export-analytics',
            'export-dashboard',
            
            // Express Checkout permissions
            'manage-express-checkout',
            'view-express-checkout',
            'create-express-checkout',
            'edit-express-checkout',
            'delete-express-checkout',
            'settings-express-checkout',
            
            // POS permissions
            'manage-pos',
            'view-pos',
            'process-transactions-pos',
            'view-transactions-pos',
            'manage-settings-pos',
            
        ])->get();

        $adminRole->syncPermissions($adminPermissions);
    }
}