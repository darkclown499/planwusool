<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusChanged;
use App\Jobs\SendStoreCustomerEmail;
use App\Models\Order;
use App\Models\OrderShipment;

class DispatchStoreCustomerEmails
{
    public function handleOrderCreated(OrderCreated $event): void
    {
        $order = $event->order;
        if (!$order->customer_email) return;
        $email = $order->customer_email;
        $customerId = $order->customer_id;
        // Dispatch after commit
        dispatch(new SendStoreCustomerEmail($order->store_id, 'order_created', $email, $order->id, null, $customerId))->afterCommit();
    }

    public function handleOrderStatusChanged(OrderStatusChanged $event): void
    {
        $order = $event->order;
        $new = strtolower($event->newStatus);
        $email = $order->customer_email;
        if (!$email) return;
        $map = [
            'cancelled' => 'order_cancelled',
            'canceled' => 'order_cancelled',
            'shipped' => 'shipment_created',
            'delivered' => 'shipment_delivered',
            'failed' => 'shipment_failed',
            'refunded' => 'order_refunded',
        ];
        $type = $map[$new] ?? null;
        if (!$type) return;
        // For delivery-related terminals, align idempotency with the courier
        // webhook dispatches by reusing the order's latest shipment id (if any).
        $shipmentId = in_array($new, ['delivered', 'failed'], true)
            ? OrderShipment::where('order_id', $order->id)->latest('id')->value('id')
            : null;
        dispatch(new SendStoreCustomerEmail($order->store_id, $type, $email, $order->id, $shipmentId, $order->customer_id))->afterCommit();
    }

    public function handlePaymentStatusChanged(Order $order, string $newPaymentStatus): void
    {
        if (strtolower($newPaymentStatus) !== 'paid') return;
        if (!$order->customer_email) return;
        dispatch(new SendStoreCustomerEmail($order->store_id, 'payment_received', $order->customer_email, $order->id, null, $order->customer_id))->afterCommit();
    }
}
