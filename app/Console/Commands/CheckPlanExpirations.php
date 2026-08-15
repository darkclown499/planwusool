<?php

namespace App\Console\Commands;

use App\Models\MerchantNotification;
use App\Models\User;
use App\Services\MerchantNotificationService;
use Illuminate\Console\Command;

class CheckPlanExpirations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-plan-expirations {--days=7 : Reminder window in days before expiration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send plan expiration reminders and lock expired subscriptions';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $start = now()->startOfDay();
        $end = now()->startOfDay()->addDays($days);

        // Phase 1: remind paid subscribers whose plan expires within the window
        $users = User::whereNotNull('plan_id')
            ->where('plan_is_active', true)
            ->where('is_trial', false)
            ->whereNotNull('plan_expire_date')
            ->whereBetween('plan_expire_date', [$start, $end])
            ->get();

        $created = 0;
        foreach ($users as $user) {
            $daysLeft = max(1, (int) ceil($start->diffInDays($user->plan_expire_date)));

            $alreadyNotified = MerchantNotification::where('user_id', $user->id)
                ->where('type', 'plan_expiring')
                ->where('related_id', $user->plan_id)
                ->whereDate('created_at', now()->toDateString())
                ->exists();

            if ($alreadyNotified) {
                continue;
            }

            MerchantNotificationService::planExpiring($user, $daysLeft);
            $created++;
        }

        // Phase 2: hard-lock expired paid subscriptions (no auto-downgrade).
        // Mark the subscription inactive so the record stays consistent and the
        // user remains blocked (needsPlanSubscription) until they renew.
        $expired = User::whereNotNull('plan_id')
            ->where('plan_is_active', true)
            ->where('is_trial', false)
            ->whereNotNull('plan_expire_date')
            ->where('plan_expire_date', '<', now())
            ->get();

        $locked = 0;
        foreach ($expired as $user) {
            $user->update(['plan_is_active' => 0]);
            MerchantNotificationService::planExpired($user);
            $locked++;
        }

        $this->info("Checked plan expirations. Created {$created} reminder(s), locked {$locked} expired subscription(s).");

        return self::SUCCESS;
    }
}
