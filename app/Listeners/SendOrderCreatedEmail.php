<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Services\EmailTemplateService;

class SendOrderCreatedEmail
{
    protected $emailTemplateService;

    public function __construct(EmailTemplateService $emailTemplateService)
    {
        $this->emailTemplateService = $emailTemplateService;
    }

    public function handle(OrderCreated $event)
    {
        $order = $event->order;
        $store = $order->store;
        
        if (!$store) return;

        $language = getSetting('defaultLanguage', 'ar', $store->user_id, $store->id);
        $customerName = $order->customer_first_name . ' ' . $order->customer_last_name;
        
        $variables = [
            '{order_name}' => $customerName,
            '{order_url}' => route('store.order-detail', ['storeSlug' => $store->slug, 'orderNumber' => $order->order_number]),
            '{store_url}' => route('store.home', ['storeSlug' => $store->slug]),
            '{app_name}' => config('app.name', 'Wusool'),
            '{app_url}' => getSchemeAwareUrl()
        ];

        // Send email only to customer (not owner). Wrapped in try/catch so a slow
        // or unreachable SMTP server never blocks or fails order placement.
        try {
            $this->emailTemplateService->sendTemplateEmailWithLanguage(
                'Order Created',
                $variables,
                $order->customer_email,
                $customerName,
                $language
            );
        } catch (\Throwable $e) {
            \Log::warning('Order created email failed, order placement continues', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}