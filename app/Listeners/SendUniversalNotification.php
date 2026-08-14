<?php

namespace App\Listeners;

use App\Services\SmsService;
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

        SmsService::sendSMS(
            $store->user_id,
            $store->id,
            $order->customer_phone,
            'Order Created',
            $variables,
            getSetting('defaultLanguage', 'ar', $store->user_id, $store->id)
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

        SmsService::sendSMS(
            $store->user_id,
            $store->id,
            $order->customer_phone,
            'Order Status Updated',
            $variables,
            getSetting('defaultLanguage', 'ar', $store->user_id, $store->id)
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

        SmsService::sendSMS(
            $store->user_id,
            $store->id,
            $customer->phone,
            'New Customer',
            $variables,
            getSetting('defaultLanguage', 'ar', $store->user_id, $store->id)
        );
    }
}