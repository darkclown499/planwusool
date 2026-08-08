<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckExpiredTrials extends Command
{
    protected $signature = 'app:check-expired-trials';
    protected $description = 'Downgrade companies with expired trials to Starter plan';

    public function handle(): int
    {
        $now = now()->startOfDay();

        $expiredTrialUsers = User::where('type', 'company')
            ->whereNotNull('plan_id')
            ->where('plan_is_active', true)
            ->whereNotNull('trial_expire_date')
            ->where('trial_expire_date', '<', $now)
            ->get();

        $downgraded = 0;

        foreach ($expiredTrialUsers as $user) {
            $starterPlan = Plan::where('name', 'Starter')->where('is_plan_enable', 'on')->first();
            
            if (!$starterPlan) {
                Log::warning("Starter plan not found, cannot downgrade user {$user->id}");
                continue;
            }

            $user->plan_id = $starterPlan->id;
            $user->plan_duration = 'yearly';
            $user->plan_expire_date = null;
            $user->trial_expire_date = null;
            $user->plan_is_active = 1;
            $user->is_trial = false;
            $user->save();

            Log::info("Downgraded user {$user->id} to Starter plan after trial expiration");
            $downgraded++;
        }

        $this->info("Checked expired trials. Downgraded {$downgraded} company(ies) to Starter plan.");

        return self::SUCCESS;
    }
}