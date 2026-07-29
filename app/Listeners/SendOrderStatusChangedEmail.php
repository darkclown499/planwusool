<?php

namespace App\Listeners;

use App\Events\OrderStatusChanged;
use App\Services\EmailTemplateService;

class SendOrderStatusChangedEmail
{
    protected $emailTemplateService;

    public function __construct(EmailTemplateService $emailTemplateService)
    {
        $this->emailTemplateService = $emailTemplateService;
    }

    public function handle(OrderStatusChanged $event)
    {
        
        $order = $event->order;
        $store = $order->store;
        
        if (!$store) return;

        $variables = [
            '{order_name}' => $order->customer_first_name . ' ' . $order->customer_last_name,
            '{order_status}' => ucfirst($event->newStatus),
            '{order_url}' => route('store.order-detail', ['storeSlug' => $store->slug, 'orderNumber' => $order->order_number]),
            '{store_url}' => route('store.home', ['storeSlug' => $store->slug]),
            '{app_name}' => config('app.name', 'Wusool'),
            '{app_url}' => getSchemeAwareUrl()
        ];

        $this->emailTemplateService->sendTemplateEmailWithLanguage(
            'Status Change',
            $variables,
            $order->customer_email,
            $order->customer_first_name . ' ' . $order->customer_last_name,
            getSetting('defaultLanguage', 'en', $store->user_id, $store->id)
        );
    }
}