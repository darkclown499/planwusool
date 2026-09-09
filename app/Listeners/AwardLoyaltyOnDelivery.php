<?php

namespace App\Listeners;

use App\Events\OrderStatusChanged;
use App\Services\LoyaltyService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

/**
 * Award loyalty points exactly when an order reaches the canonical DELIVERED
 * business state (Section 20).
 *
 * This listener is queued on the dedicated `loyalty` queue. The production
 * queue worker MUST consume the `loyalty` queue alongside the canonical
 * `default`, `accounting` and `notifications` queues — see DEPLOYMENT.md §6 /
 * deploy.sh (queue-worker unit). A worker that omits `loyalty` silently
 * strands delivery awards (production finding 2026-09-04).
 *
 * Points must NOT be granted merely on created/confirmed/processing/shipped.
 * The delivered transition is the single authoritative grant point. Earning is
 * idempotent inside LoyaltyService (per store+order 'earn' guard, serialized by
 * an order-row lock), so replicated deliveries, retries and replays never
 * double-award.
 *
 * Exceptions are intentionally NOT swallowed here: a transient infrastructure
 * failure must remain retryable so a delivery award is never silently lost.
 * Permanent invalid records fail safely (the earn guard awards nothing) and land
 * in `failed_jobs` after retries are exhausted.
 */
class AwardLoyaltyOnDelivery implements ShouldQueue
{
    /**
     * The number of times the queued listener may be attempted before failing.
     */
    public int $tries = 3;

    /**
     * Seconds to wait before retrying after a failed attempt (no infinite loop).
     */
    public array $backoff = [10, 60, 300];

    /**
     * The dedicated queue the listener is pushed to.
     */
    public string $queue = 'loyalty';

    public function __construct(private LoyaltyService $loyaltyService)
    {
    }

    public function handle(OrderStatusChanged $event): void
    {
        if (strtolower($event->newStatus) !== 'delivered') {
            return;
        }

        $this->loyaltyService->earnPointsForOrder($event->order);
    }

    /**
     * Log the terminal failure after retries are exhausted so operations can
     * reconcile the order later. Replaying this job is safe (earn guard).
     */
    public function failed(OrderStatusChanged $event, \Throwable $exception): void
    {
        Log::error('AwardLoyaltyOnDelivery exhausted retries', [
            'order_id' => $event->order->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
