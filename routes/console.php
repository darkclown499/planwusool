<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Check for abandoned carts and send reminders every 6 hours
Schedule::command('app:check-abandoned-carts --hours=24')
    ->everySixHours()
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/abandoned-carts.log'));

// Notify merchants about expiring subscriptions once a day
Schedule::command('app:check-plan-expirations --days=7')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/plan-expirations.log'));
