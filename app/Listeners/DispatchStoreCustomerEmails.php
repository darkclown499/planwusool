<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Events\OrderStatusChanged;
use App\Jobs\SendStoreCustomerEmail;
use App\Models\Order;

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
        ];
        $type = $map[$new] ?? null;
        if (!$type) return;
        dispatch(new SendStoreCustomerEmail($order->store_id, $type, $email, $order->id, null, $order->customer_id))->afterCommit();
    }

    public function handlePaymentStatusChanged(Order $order, string $newPaymentStatus): void
    {
        if (strtolower($newPaymentStatus) !== 'paid') return;
        if (!$order->customer_email) return;
        dispatch(new SendStoreCustomerEmail($order->store_id, 'payment_received', $order->customer_email, $order->id, null, $order->customer_id))->afterCommit();
    }
}
