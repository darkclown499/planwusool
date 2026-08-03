<?php

namespace App\Notifications\Channels;

use App\Models\PushSubscription;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;

class WebPushChannel
{
    /**
     * Send the given notification.
     *
     * @param  mixed  $notifiable
     * @param  \Illuminate\Notifications\Notification  $notification
     * @return void
     */
    public function send($notifiable, Notification $notification)
    {
        // Only send to notifiable instances that have a store_id
        if (!method_exists($notification, 'toWebPush')) {
            return;
        }

        $payload = $notification->toWebPush($notifiable);

        if (empty($payload)) {
            return;
        }

        $storeId = $notifiable->store_id ?? null;

        // Build the subscription query
        $query = PushSubscription::where('is_active', true);

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        if (method_exists($notifiable, 'getPushSubscriptionCustomerId')) {
            $customerId = $notifiable->getPushSubscriptionCustomerId();
            if ($customerId) {
                $query->where('customer_id', $customerId);
            }
        }

        $subscriptions = $query->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $vapid = $this->getVapidConfig();

        if (empty($vapid['publicKey']) || empty($vapid['privateKey'])) {
            Log::warning('WebPushChannel: VAPID keys not configured. Skipping push send.');
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $vapid['subject'],
                'publicKey' => $vapid['publicKey'],
                'privateKey' => $vapid['privateKey'],
            ],
        ]);

        $body = is_string($payload) ? $payload : json_encode($payload);

        foreach ($subscriptions as $subscription) {
            try {
                $webPush->queueNotification(
                    $subscription->endpoint,
                    $body,
                    $subscription->public_key,
                    $subscription->auth_token,
                    [
                        'TTL' => 86400,
                        'urgency' => 'normal',
                        'contentEncoding' => $subscription->content_encoding ?: 'aes128gcm',
                    ]
                );
            } catch (\Throwable $e) {
                Log::warning('WebPushChannel: Failed to queue notification', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Send all queued notifications
        foreach ($webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                Log::warning('WebPushChannel: Push send failed', [
                    'endpoint' => $report->getEndpoint(),
                    'reason' => $report->getReason(),
                ]);

                // Deactivate subscription if endpoint is gone/invalid
                $device = PushSubscription::where('endpoint', $report->getEndpoint())->first();
                if ($device && $report->isSubscriptionExpired()) {
                    $device->deactivate();
                }
            }
        }
    }

    /**
     * Get VAPID configuration from config/services.php.
     *
     * @return array
     */
    protected function getVapidConfig(): array
    {
        $vapid = config('services.vapid', []);

        return [
            'subject' => $vapid['subject'] ?? config('app.url'),
            'publicKey' => $vapid['public_key'] ?? env('VAPID_PUBLIC_KEY'),
            'privateKey' => $vapid['private_key'] ?? env('VAPID_PRIVATE_KEY'),
        ];
    }
}
