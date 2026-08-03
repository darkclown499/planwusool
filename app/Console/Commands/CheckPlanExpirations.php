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
    protected $description = 'Send merchant notifications for subscriptions expiring soon';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $start = now()->startOfDay();
        $end = now()->startOfDay()->addDays($days);

        $users = User::whereNotNull('plan_id')
            ->where('plan_is_active', true)
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

        $this->info("Checked plan expirations. Created {$created} notification(s).");

        return self::SUCCESS;
    }
}
