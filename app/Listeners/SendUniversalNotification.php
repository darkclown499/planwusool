<?php

namespace App\Listeners;

use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class SendUniversalNotification
{
    public function handleOrderCreated($event)
    {
        $order = $event->order;
        $store = $order->store;
        
        if (!$store || !$store->user) return;

        $variables = [
            'order_number' => $order->order_number,
            'customer_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name),
            'store_name' => $store->name,
            'company_name' => $store->user->name,
            'total_amount' => number_format($order->total_amount, 2),
            'order_date' => $order->created_at->format('d/m/Y H:i'),
        ];

        NotificationService::send(
            $store->user_id,
            $store->id,
            'sms',
            $order->customer_phone,
            'Order Created',
            $variables
        );
    }

    public function handleOrderStatusChanged($event)
    {
        $order = $event->order;
        $store = $order->store;
        
        if (!$store || !$store->user) return;

        $variables = [
            'order_number' => $order->order_number,
            'customer_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name),
            'store_name' => $store->name,
            'company_name' => $store->user->name,
            'status' => ucfirst($order->status),
            'order_date' => $order->created_at->format('d/m/Y H:i'),
        ];

        NotificationService::send(
            $store->user_id,
            $store->id,
            'sms',
            $order->customer_phone,
            'Order Status Updated',
            $variables
        );
    }

    public function handleCustomerCreated($event)
    {
        $customer = $event->customer;
        $store = $customer->store;
        
        if (!$store || !$store->user) return;

        $variables = [
            'customer_name' => trim($customer->first_name . ' ' . $customer->last_name),
            'store_name' => $store->name,
            'company_name' => $store->user->name,
            'customer_email' => $customer->email,
        ];

        NotificationService::send(
            $store->user_id,
            $store->id,
            'sms',
            $customer->phone,
            'New Customer',
            $variables
        );
    }
}