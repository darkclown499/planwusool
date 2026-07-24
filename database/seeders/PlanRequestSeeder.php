<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\PlanRequest;
use App\Models\User;
use App\Models\Plan;
use Carbon\Carbon;

class PlanRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if plan request data already exists
        if (PlanRequest::exists()) {
            $this->command->info('Plan request data already exists. Skipping seeder to preserve existing data.');
            return;
        }

        $users = User::where('type', 'company')->get();
        $plans = Plan::all();

        if ($users->isEmpty() || $plans->isEmpty()) {
            $this->command->warn('No company users or plans found. Please run UserSeeder and PlanSeeder first.');
            return;
        }

        $totalRequests = 0;
        $messages = $this->getRequestMessages();

        foreach ($users as $userIndex => $user) {
            $requestCount = $this->getRequestCount($user->email);
            
            for ($i = 0; $i < $requestCount; $i++) {
                $daysAgo = rand(1, 120) + ($userIndex * 3) + $i;
                $createdAt = Carbon::now()->subDays($daysAgo);
                $updatedAt = $createdAt->copy()->addDays(rand(0, min($daysAgo, 30)));
                
                PlanRequest::create([
                    'user_id' => $user->id,
                    'plan_id' => $plans->random()->id,
                    'status' => $this->getRandomStatus($i),
                    'message' => $messages[array_rand($messages)],
                    'created_at' => $createdAt,
                    'updated_at' => $updatedAt,
                ]);
                $totalRequests++;
            }
        }

    }

    private function getRequestCount(string $email): int
    {
        if ($email === 'company@example.com') {
            return config('app.is_demo') ? rand(6, 8) : rand(3, 4);
        }
        
        return config('app.is_demo') ? rand(3, 5) : rand(1, 2);
    }

    private function getRandomStatus(int $requestIndex): string
    {
        $statuses = ['pending', 'approved', 'rejected'];
        $weights = [60, 30, 10]; // 25% pending, 60% approved, 15% rejected
        
        // Recent requests more likely to be pending
        if ($requestIndex < 2) {
            $weights = [60, 30, 10];
        }
        
        $random = rand(1, 100);
        $cumulative = 0;
        
        foreach ($weights as $index => $weight) {
            $cumulative += $weight;
            if ($random <= $cumulative) {
                return $statuses[$index];
            }
        }
        
        return 'approved';
    }

    private function getRequestMessages(): array
    {
        return [
            'I would like to upgrade my plan to access more features for my growing business.',
            'Need higher limits for products and storage as we are expanding rapidly.',
            'Current plan is not sufficient for our increasing customer base and orders.',
            'Looking to expand with premium features like advanced analytics and reporting.',
            'Require additional storage space and bandwidth for our product catalogs.',
            'Want to unlock advanced marketing tools and customer segmentation features.',
            'Need multi-store capabilities to manage our different business locations.',
            'Seeking better customer support options and priority assistance.',
            'Our business has grown beyond current plan limits, need immediate upgrade.',
            'Require access to API integrations and third-party app connections.',
            'Need advanced inventory management features for better stock control.',
            'Looking for enhanced security features and SSL certificates.',
            'Want to access premium themes and customization options.',
            'Need higher email marketing limits for our promotional campaigns.',
            'Require advanced SEO tools and search engine optimization features.',
            'Looking to integrate with accounting software and payment gateways.',
            'Need white-label solutions for our client projects.',
            'Want access to advanced shipping options and logistics integrations.',
            'Require multi-currency support for international business expansion.',
            'Need advanced user role management and permission controls.'
        ];
    }
}