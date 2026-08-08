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