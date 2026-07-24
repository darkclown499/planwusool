<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Plan;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Super Admin User
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Super Admin',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
                'type' => 'superadmin',
                'lang' => 'en'
            ]
        );

        // Assign super admin role
        $superAdmin->assignRole('superadmin');

        // Get default plan
        $defaultPlan = Plan::where('is_default', true)->first();
        $highestPlan = Plan::orderBy('price', 'desc')->first();

        // Create Company User
        $company = User::firstOrCreate(
            ['email' => 'company@example.com'],
            [
                'name' => 'Company',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
                'type' => 'company',
                'lang' => 'en',
                'plan_id' => $highestPlan ? $highestPlan->id : ($defaultPlan ? $defaultPlan->id : null),
                'referral_code' => rand(100000, 999999),
                'created_by' => $superAdmin->id,
            ]
        );

        // Assign company role
        $company->assignRole('company');

        // Create additional roles only in demo mode
        if (config('app.is_demo')) {
            $this->createDemoRoles($company);
            $this->createDemoCompanies($defaultPlan, $superAdmin);
        }

        // Assign default plan to all company users with null plan_id
        if ($defaultPlan) {
            User::where('type', 'company')
                ->whereNull('plan_id')
                ->update(['plan_id' => $defaultPlan->id]);
        }
        
        // Refresh permissions for all existing company users
        $companyRole = Role::where('name', 'company')->first();
        if ($companyRole) {
            $companyUsers = User::where('type', 'company')->get();
            foreach ($companyUsers as $user) {
                $user->syncRoles(['company']);
            }
        }
    }

    private function createDemoRoles($company)
    {
        // Create manager role
        $managerRole = Role::firstOrCreate(
            ['name' => 'manager_' . $company->id, 'guard_name' => 'web'],
            [
                'label' => 'Store Manager',
                'description' => 'Store Manager has access to manage store operations',
                'created_by' => $company->id,
            ]
        );

        // Create accountant role
        $accountantRole = Role::firstOrCreate(
            ['name' => 'accountant_' . $company->id, 'guard_name' => 'web'],
            [
                'label' => 'Accountant',
                'description' => 'Accountant has access to financial data and reports',
                'created_by' => $company->id,
            ]
        );

        // Create content writer role
        $contentWriterRole = Role::firstOrCreate(
            ['name' => 'content_writer_' . $company->id, 'guard_name' => 'web'],
            [
                'label' => 'Content Writer',
                'description' => 'Content Writer has access to manage content and products',
                'created_by' => $company->id,
            ]
        );

        // Assign permissions to manager role (Wusool specific)
        $managerPermissions = \Spatie\Permission\Models\Permission::whereIn('name', [
            'manage-dashboard',
            'manage-stores',
            'view-stores',
            'edit-stores',
            'manage-products',
            'view-products',
            'create-products',
            'edit-products',
            'delete-products',
            'manage-categories',
            'view-categories',
            'create-categories',
            'edit-categories',
            'manage-orders',
            'view-orders',
            'edit-orders',
            'manage-customers',
            'view-customers',
            'edit-customers',
        ])->get();
        $managerRole->syncPermissions($managerPermissions);

        // Assign permissions to accountant role (Wusool specific)
        $accountantPermissions = \Spatie\Permission\Models\Permission::whereIn('name', [
            'manage-dashboard',
            'view-orders',
            'manage-orders',
            'view-customers',
            'manage-tax',
            'view-tax',
            'create-tax',
            'edit-tax',
            'manage-shipping',
            'view-shipping',
            'export-orders',
            'export-customers',
        ])->get();
        $accountantRole->syncPermissions($accountantPermissions);

        // Assign permissions to content writer role (Wusool specific)
        $contentWriterPermissions = \Spatie\Permission\Models\Permission::whereIn('name', [
            'manage-dashboard',
            'manage-products',
            'view-products',
            'create-products',
            'edit-products',
            'manage-categories',
            'view-categories',
            'create-categories',
            'edit-categories',
            'manage-media',
            'upload-media',
            'delete-media',
            'view-customers',
        ])->get();
        $contentWriterRole->syncPermissions($contentWriterPermissions);
    }

    private function createDemoCompanies($defaultPlan, $superAdmin)
    {
        // Get all active plans for random assignment
        $activePlans = Plan::where('is_plan_enable', 'on')->pluck('id')->toArray();
        
        $companies = [
            ['name' => 'Global Tech Solutions', 'email' => 'admin@globaltechsolutions.com'],
            ['name' => 'Digital Commerce Hub', 'email' => 'contact@digitalcommercehub.com'],
            ['name' => 'Premium Business Group', 'email' => 'info@premiumbusinessgroup.com'],
            ['name' => 'Modern Enterprise Ltd', 'email' => 'hello@modernenterprise.com'],
            ['name' => 'Active Business Solutions', 'email' => 'sales@activebusiness.com'],
            ['name' => 'Luxury Commerce Corp', 'email' => 'support@luxurycommerce.com'],
            ['name' => 'Smart Business Partners', 'email' => 'orders@smartbusiness.com'],
            ['name' => 'Urban Commerce Group', 'email' => 'service@urbancommerce.com'],
            ['name' => 'Global Trade Solutions', 'email' => 'care@globaltradesolutions.com'],
            ['name' => 'Metro Business Center', 'email' => 'team@metrobusiness.com'],
            ['name' => 'Tech Commerce Pro', 'email' => 'info@techcommercepro.com'],
            ['name' => 'Prime Enterprise Group', 'email' => 'contact@primeenterprise.com'],
        ];

        foreach ($companies as $index => $companyData) {
            $daysAgo = $index + 5;
            $createdAt = Carbon::now()->subDays($daysAgo);

            $user = User::firstOrCreate(
                ['email' => $companyData['email']],
                [
                    'name' => $companyData['name'],
                    'email_verified_at' => $createdAt,
                    'password' => Hash::make('password'),
                    'type' => 'company',
                    'lang' => 'en',
                    'plan_id' => !empty($activePlans) ? $activePlans[array_rand($activePlans)] : ($defaultPlan ? $defaultPlan->id : null),
                    'referral_code' => rand(100000, 999999),
                    'created_by' => $superAdmin->id,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt
                ]
            );

            // Assign company role
            $user->assignRole('company');

            // Create roles for this company
            $this->createCompanyRoles($user, $createdAt);
        }
    }

    private function createCompanyRoles($company, $createdAt)
    {
        $managerRole = Role::firstOrCreate(
            ['name' => 'manager_' . $company->id, 'guard_name' => 'web'],
            [
                'label' => 'Store Manager',
                'description' => 'Store Manager has access to manage store operations',
                'created_by' => $company->id,
                'created_at' => $createdAt,
                'updated_at' => $createdAt
            ]
        );

        $accountantRole = Role::firstOrCreate(
            ['name' => 'accountant_' . $company->id, 'guard_name' => 'web'],
            [
                'label' => 'Accountant',
                'description' => 'Accountant has access to financial data and reports',
                'created_by' => $company->id,
                'created_at' => $createdAt,
                'updated_at' => $createdAt
            ]
        );

        $contentWriterRole = Role::firstOrCreate(
            ['name' => 'content_writer_' . $company->id, 'guard_name' => 'web'],
            [
                'label' => 'Content Writer',
                'description' => 'Content Writer has access to manage content and products',
                'created_by' => $company->id,
                'created_at' => $createdAt,
                'updated_at' => $createdAt
            ]
        );

        // Assign Wusool specific permissions
        $managerPermissions = \Spatie\Permission\Models\Permission::whereIn('name', [
            'manage-dashboard', 'manage-stores', 'view-stores', 'edit-stores',
            'manage-products', 'view-products', 'create-products', 'edit-products', 'delete-products',
            'manage-categories', 'view-categories', 'create-categories', 'edit-categories',
            'manage-orders', 'view-orders', 'edit-orders',
            'manage-customers', 'view-customers', 'edit-customers'
        ])->get();
        $managerRole->syncPermissions($managerPermissions);

        $accountantPermissions = \Spatie\Permission\Models\Permission::whereIn('name', [
            'manage-dashboard', 'view-orders', 'manage-orders', 'view-customers',
            'manage-tax', 'view-tax', 'create-tax', 'edit-tax',
            'manage-shipping', 'view-shipping', 'export-orders', 'export-customers'
        ])->get();
        $accountantRole->syncPermissions($accountantPermissions);

        $contentWriterPermissions = \Spatie\Permission\Models\Permission::whereIn('name', [
            'manage-dashboard', 'manage-products', 'view-products', 'create-products', 'edit-products',
            'manage-categories', 'view-categories', 'create-categories', 'edit-categories',
            'manage-media', 'upload-media', 'delete-media', 'view-customers'
        ])->get();
        $contentWriterRole->syncPermissions($contentWriterPermissions);
    }
}