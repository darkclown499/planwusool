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

// Check for expired trials and downgrade to Starter plan daily at 2 AM
Schedule::command('app:check-expired-trials')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/expired-trials.log'));

// Send plan-expiration reminders and lock expired subscriptions daily
Schedule::command('app:check-plan-expirations --days=7')
    ->dailyAt('02:15')
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/plan-expirations.log'));

// ERP inventory sync (hourly configs each hour, daily configs once a day)
Schedule::command('erp:sync --interval=hourly')
    ->hourly()
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/erp-sync.log'));
Schedule::command('erp:sync --interval=daily')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/erp-sync.log'));

// Expire loyalty points daily at 3:30 AM
Schedule::command('loyalty:expire')
    ->dailyAt('03:30')
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/loyalty-expire.log'));
