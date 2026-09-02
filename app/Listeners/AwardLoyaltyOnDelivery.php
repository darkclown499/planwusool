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
 * Points must NOT be granted merely on created/confirmed/processing/shipped.
 * The delivered transition is the single authoritative grant point. Earning is
 * idempotent inside LoyaltyService (per store+order 'earn' guard), so repeated
 * delivered transitions never double-award.
 */
class AwardLoyaltyOnDelivery implements ShouldQueue
{
    public string $queue = 'loyalty';

    public function __construct(private LoyaltyService $loyaltyService)
    {
    }

    public function handle(OrderStatusChanged $event): void
    {
        if (strtolower($event->newStatus) !== 'delivered') {
            return;
        }

        try {
            $this->loyaltyService->earnPointsForOrder($event->order);
        } catch (\Throwable $e) {
            Log::warning('AwardLoyaltyOnDelivery failed', [
                'order_id' => $event->order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
