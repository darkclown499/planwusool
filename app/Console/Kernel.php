<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * NOTE: This legacy Laravel-11 style Kernel is NOT bound in this Laravel 12
     * application — the console kernel binding resolves to
     * Illuminate\Foundation\Console\Kernel. The live scheduler source is
     * routes/console.php, wired via bootstrap/app.php withRouting(commands:).
     * All schedules (abandoned-cart lifecycle + reminders, plan/trial/loyalty
     * expiries, ERP sync, S3 backup) are defined there. Anything defined here
     * is dead weight and would only duplicate the live definitions.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Scheduler definitions intentionally removed — see routes/console.php.
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