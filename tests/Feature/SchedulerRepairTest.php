<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\CallbackEvent;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P5A-A3 - live scheduler repair.
 *
 * routes/console.php is the single live scheduler source (Laravel 12,
 * wired through bootstrap/app.php withRouting(commands:)). These tests
 * assert the schedule that actually runs: the draft → abandoned lifecycle
 * (reusing the canonical AbandonedCartService), the backup:s3 run, and that
 * every legitimate existing schedule is preserved exactly once.
 */
class SchedulerRepairTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Populate the Schedule singleton exactly the way `php artisan
     * schedule:list` does — the console kernel evaluates routes/console.php
     * the first time commands are discovered.
     */
    protected function bootScheduler(): void
    {
        $this->app->make(ConsoleKernel::class)->bootstrap();
    }

    protected function scheduledEvents(): array
    {
        $this->bootScheduler();

        return app(Schedule::class)->events();
    }

    protected function eventsForCommand(string $needle): array
    {
        return array_values(array_filter(
            $this->scheduledEvents(),
            fn ($event) => is_string($event->command ?? null) && str_contains($event->command, $needle)
        ));
    }

    protected function commandNamesInSchedule(): array
    {
        return collect($this->scheduledEvents())
            ->map(fn ($event) => $event->command ?? null)
            ->filter()
            ->values()
            ->all();
    }

    public function test_abandoned_draft_lifecycle_is_registered_in_the_live_schedule(): void
    {
        $events = array_values(array_filter(
            $this->scheduledEvents(),
            fn ($event) => ($event->description ?? null) === 'abandoned-mark-stale'
        ));

        $this->assertCount(1, $events, 'abandoned-mark-stale must be registered exactly once');
        $this->assertInstanceOf(CallbackEvent::class, $events[0]);
        $this->assertSame('*/15 * * * *', $events[0]->expression);
    }

    public function test_abandoned_lifecycle_invokes_the_canonical_service(): void
    {
        $event = array_values(array_filter(
            $this->scheduledEvents(),
            fn ($event) => ($event->description ?? null) === 'abandoned-mark-stale'
        ));
        $this->assertCount(1, $event);

        // The event is configured to not overlap in production (mutex-guarded).
        $this->assertTrue($event[0]->withoutOverlapping);

        // Invoke the event's real callback (the canonical
        // AbandonedCartService::markStaleDraftsAsAbandoned worker). Empty
        // database → zero carts marked, integer count returned.
        $execute = new \ReflectionMethod($event[0], 'execute');
        $this->assertSame(0, $execute->invoke($event[0], $this->app));
    }

    public function test_backup_s3_is_registered_in_the_live_schedule(): void
    {
        $backups = $this->eventsForCommand('backup:s3');

        $this->assertCount(1, $backups, 'backup:s3 must be registered exactly once');
        $this->assertStringContainsString('--all', $backups[0]->command);
        $this->assertStringContainsString('--compress', $backups[0]->command);
        $this->assertStringContainsString('--keep=7', $backups[0]->command);
        $this->assertSame('0 3 * * *', $backups[0]->expression);
    }

    public function test_existing_live_schedules_are_preserved(): void
    {
        $names = implode(' | ', $this->commandNamesInSchedule());

        foreach ([
            'app:check-abandoned-carts',
            'app:check-expired-trials',
            'app:check-plan-expirations',
            'erp:sync',
            'loyalty:expire',
        ] as $needle) {
            $this->assertNotFalse(
                str_contains($names, $needle),
                "expected live schedule {$needle} was removed (schedule: {$names})"
            );
        }
    }

    public function test_legacy_duplicates_are_not_reregistered(): void
    {
        // Every command that once existed BOTH in the legacy Kernel and in the
        // live file must still appear exactly once — never doubled by the fix.
        foreach (['backup:s3', 'app:check-abandoned-carts', 'app:check-expired-trials', 'loyalty:expire'] as $needle) {
            $this->assertCount(1, $this->eventsForCommand($needle), "{$needle} must not be duplicated");
        }
    }
}