<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Draft → ABANDONED worker: every 15 minutes mark drafts idle >30min as abandoned, generate recovery token & WhatsApp automation
        $schedule->call(function () {
            app(\App\Services\AbandonedCartService::class)->markStaleDraftsAsAbandoned(30);
        })->everyFifteenMinutes()->withoutOverlapping()->name('abandoned-mark-stale')->sendOutputTo(storage_path('logs/abandoned-mark.log'));

        // Check for abandoned carts and send reminders every 6 hours
        $schedule->command('app:check-abandoned-carts --hours=24')
            ->everySixHours()
            ->withoutOverlapping()
            ->sendOutputTo(storage_path('logs/abandoned-carts.log'));

        // Check for expired trials and downgrade to Starter plan daily at 2 AM
        $schedule->command('app:check-expired-trials')
            ->dailyAt('02:00')
            ->withoutOverlapping()
            ->sendOutputTo(storage_path('logs/expired-trials.log'));

        // Daily backup to S3 at 3 AM
        $schedule->command('backup:s3 --all --compress --keep=7')
            ->dailyAt('03:00')
            ->withoutOverlapping()
            ->sendOutputTo(storage_path('logs/backup-s3.log'));
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}