<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Plan;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class AdditionalUserSeeder extends Seeder
{
    public function run(): void
    {
        // Only run in demo mode
        if (!config('app.is_demo', false)) {
            $this->command->info('Skipping additional users seeder (not in demo mode).');
            return;
        }

        // Check if additional users already exist
        if (User::where('email', 'like', '%.company%@example.com')->exists()) {
            $this->command->info('Additional users already exist. Skipping seeder to preserve existing data.');
            return;
        }

        $companies = User::where('type', 'company')->get();
        $defaultPlan = Plan::where('is_default', true)->first();

        if ($companies->isEmpty()) {
            $this->command->error('No company users found. Please run UserSeeder first.');
            return;
        }

        $additionalUsers = $this->getAdditionalUsers();
        $totalUsers = 0;

        foreach ($companies as $companyIndex => $company) {
            $stores = Store::where('user_id', $company->id)->get();
            
            if ($stores->isEmpty()) {
                // Create users without store assignment
                foreach ($additionalUsers as $userIndex => $userData) {
                    $this->createUser($userData, $company, null, $companyIndex, 0, $userIndex, $defaultPlan);
                    $totalUsers++;
                }
            } else {
                // Create users for each store
                foreach ($stores as $storeIndex => $store) {
                    foreach ($additionalUsers as $userIndex => $userData) {
                        $this->createUser($userData, $company, $store, $companyIndex, $storeIndex, $userIndex, $defaultPlan);
                        $totalUsers++;
                    }
                }
            }
        }

    }


    private function createUser($userData, $company, $store, $companyIndex, $storeIndex, $userIndex, $defaultPlan): void
    {
        $uniqueEmail = $store 
            ? str_replace('@example.com', ".{$company->name}.store{$store->id}@example.com", $userData['email'])
            : str_replace('@example.com', ".{$company->id}@example.com", $userData['email']);

        $daysAgo = ($companyIndex * 100) + ($storeIndex * 15) + $userIndex + 1;
        $createdAt = Carbon::now()->subDays($daysAgo);
        
        $user = User::create([
            'name' => $userData['name'],
            'email' => $uniqueEmail,
            'email_verified_at' => $createdAt,
            'password' => Hash::make('password'),
            'type' => $userData['role'],
            'lang' => 'en',
            'plan_id' => $defaultPlan ? $defaultPlan->id : null,
            'referral_code' => rand(100000, 999999),
            'created_by' => $company->id,
            'current_store' => $store ? $store->id : null,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        // Assign role with company-specific role name
        $roleName = $userData['role'] . '_' . $company->id;
        $user->assignRole($roleName);
    }

    private function getAdditionalUsers(): array
    {
        return [
            ['name' => 'John Smith', 'email' => 'john.smith@example.com', 'role' => 'content_writer'],
            ['name' => 'Sarah Johnson', 'email' => 'sarah.johnson@example.com', 'role' => 'accountant'],
            ['name' => 'Mike Wilson', 'email' => 'mike.wilson@example.com', 'role' => 'manager'],
            ['name' => 'Emma Davis', 'email' => 'emma.davis@example.com', 'role' => 'accountant'],
            ['name' => 'David Brown', 'email' => 'david.brown@example.com', 'role' => 'content_writer'],
            ['name' => 'Lisa Garcia', 'email' => 'lisa.garcia@example.com', 'role' => 'content_writer'],
            ['name' => 'Robert Miller', 'email' => 'robert.miller@example.com', 'role' => 'accountant'],
            ['name' => 'Jennifer Taylor', 'email' => 'jennifer.taylor@example.com', 'role' => 'manager'],
            ['name' => 'James Anderson', 'email' => 'james.anderson@example.com', 'role' => 'accountant'],
            ['name' => 'Maria Martinez', 'email' => 'maria.martinez@example.com', 'role' => 'content_writer'],
            ['name' => 'Christopher Lee', 'email' => 'christopher.lee@example.com', 'role' => 'content_writer'],
            ['name' => 'Amanda White', 'email' => 'amanda.white@example.com', 'role' => 'accountant'],
            ['name' => 'Daniel Harris', 'email' => 'daniel.harris@example.com', 'role' => 'manager'],
            ['name' => 'Jessica Clark', 'email' => 'jessica.clark@example.com', 'role' => 'accountant'],
            ['name' => 'Kevin Rodriguez', 'email' => 'kevin.rodriguez@example.com', 'role' => 'content_writer']
        ];
    }
}