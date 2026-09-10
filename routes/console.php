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

// Draft → ABANDONED lifecycle: every 15 minutes mark drafts idle >30min as
// abandoned, generate a recovery token and trigger the WhatsApp automation.
// Reuses the canonical AbandonedCartService::markStaleDraftsAsAbandoned
// (idempotent + store-scoped). The reminder run above is a separate flow.
Schedule::call(function () {
    app(\App\Services\AbandonedCartService::class)->markStaleDraftsAsAbandoned(30);
})->everyFifteenMinutes()->name('abandoned-mark-stale')->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/abandoned-mark.log'));

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

// Back up database + storage to S3 daily at 3 AM (keep 7 days)
Schedule::command('backup:s3 --all --compress --keep=7')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->sendOutputTo(storage_path('logs/backup-s3.log'));
