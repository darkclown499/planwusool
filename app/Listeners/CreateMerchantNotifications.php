<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusChanged;
use App\Services\MerchantNotificationService;

class CreateMerchantNotifications
{
    /**
     * Create a merchant notification when an order is created.
     */
    public function onOrderCreated(OrderCreated $event): void
    {
        MerchantNotificationService::orderCreated($event->order);
    }

    /**
     * Create a merchant notification when an order status changes.
     */
    public function onOrderStatusChanged(OrderStatusChanged $event): void
    {
        if ($event->newStatus === 'cancelled') {
            MerchantNotificationService::orderCancelled($event->order);
            return;
        }

        MerchantNotificationService::orderStatusChanged($event->order, $event->oldStatus, $event->newStatus);
    }
}
