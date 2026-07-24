<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class PlanOrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if plan order data already exists
        if (\App\Models\PlanOrder::exists()) {
            $this->command->info('Plan order data already exists. Skipping seeder to preserve existing data.');
            return;
        }

        $users = \App\Models\User::where('type', 'company')->get();
        $plans = \App\Models\Plan::all();
        $coupons = \App\Models\Coupon::where('status', true)->get();
        $superAdmin = \App\Models\User::where('type', 'superadmin')->first();

        if ($users->isEmpty() || $plans->isEmpty()) {
            $this->command->warn('No users or plans found. Please run UserSeeder and PlanSeeder first.');
            return;
        }

        $totalOrders = 0;
        $orderCounts = config('app.is_demo') ? $this->getDemoOrderCounts() : $this->getMainOrderCounts();

        foreach ($users as $userIndex => $user) {
            // Main company gets 4-6 orders, others get 2-3 orders
            if ($user->email === 'company@example.com') {
                $userOrderCount = rand(4, 6);
            } else {
                $userOrderCount = config('app.is_demo') ? rand(2, 3) : rand(1, 2);
            }
            
            for ($i = 0; $i < $userOrderCount; $i++) {
                $plan = $plans->random();
                $coupon = ($i % 4 === 0 && $coupons->isNotEmpty()) ? $coupons->random() : null;
                
                $daysAgo = rand(1, 180) + ($userIndex * 5) + $i;
                $orderedAt = Carbon::now()->subDays($daysAgo);
                
                $status = $this->getRandomStatus($i);
                $processedAt = null;
                $processedBy = null;
                
                if ($status !== 'pending') {
                    $processedAt = $orderedAt->copy()->addHours(rand(1, 72));
                    $processedBy = $superAdmin?->id;
                }
                
                $planOrder = new \App\Models\PlanOrder();
                $planOrder->user_id = $user->id;
                $planOrder->plan_id = $plan->id;
                $planOrder->calculatePrices($plan->price, $coupon);
                $planOrder->status = $status;
                $planOrder->ordered_at = $orderedAt;
                $planOrder->processed_at = $processedAt;
                $planOrder->processed_by = $processedBy;
                $planOrder->created_at = $orderedAt;
                $planOrder->updated_at = $processedAt ?? $orderedAt;
                
                $planOrder->save();
                $totalOrders++;
            }
        }

    }

    private function getDemoOrderCounts(): array
    {
        // First user (main company) gets more orders, others get varied amounts
        return [5, 3, 4, 2, 3, 4, 2, 3, 2, 4, 3, 2, 3];
    }

    private function getMainOrderCounts(): array
    {
        // Main version: fewer orders per user
        return [2, 1, 2, 1, 1];
    }

    private function getRandomStatus(int $orderIndex): string
    {
        $statuses = ['approved', 'pending', 'rejected'];
        $weights = [30, 60, 10]; // 30% approved, 60% pending, 10% rejected
        
        // First order is usually approved, recent orders more likely to be pending
        if ($orderIndex === 0) {
            return 'approved';
        }
        
        if ($orderIndex >= 3) {
            $weights = [30, 60, 10]; // Still less pending for recent orders
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
}