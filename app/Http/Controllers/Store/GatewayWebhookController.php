<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Webhook;

/**
 * Public, unauthenticated webhook endpoints for payment gateways so that an
 * order can be flipped from pending -> paid even when the customer closes the
 * browser tab right after paying (the checkout success redirect never running).
 */
class GatewayWebhookController extends Controller
{
    /**
     * Mark an order as paid and trigger idempotent post-order extras
     * (loyalty points, abandoned cart, coupon tracking, OrderCreated event).
     */
    private function markOrderPaid(Order $order, string $gateway, ?string $transactionId = null, array $details = []): void
    {
        if ($order->payment_status === 'paid') {
            // Order already paid (browser callback or prior webhook) — still
            // run completePostOrderExtras in case it hasn't been executed yet
            // (e.g. browser callback crashed after setting paid but before extras).
            app(OrderService::class)->completePostOrderExtras($order);
            return;
        }
        $order->update([
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_gateway' => $gateway,
            'payment_transaction_id' => $transactionId ?: $order->payment_transaction_id,
            'payment_details' => array_merge($order->payment_details ?? [], array_merge($details, [
                'verified_via_webhook_at' => now(),
            ])),
        ]);

        // Trigger post-order extras and OrderCreated event (idempotent CAS)
        app(OrderService::class)->completePostOrderExtras($order);
    }

    public function stripe(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        if (!$signature) {
            return response('Missing Stripe-Signature header', 400);
        }

        $event = json_decode($payload, true);
        $object = $event['data']['object'] ?? [];
        $orderNumber = $object['metadata']['order_number'] ?? $object['client_reference_id'] ?? null;

        if (!$orderNumber) {
            return response('OK', 200); // Not one of our store sessions.
        }

        $order = Order::where('order_number', $orderNumber)->first();
        if (!$order) {
            return response('Order not found', 404);
        }

        $config = getPaymentMethodConfig('stripe', $order->store->user->id, $order->store_id);
        $webhookSecret = $config['webhook_secret'] ?? null;
        if (!$config['enabled'] || !$webhookSecret || !$config['secret']) {
            // Without a webhook secret we cannot verify the payload — never
            // mark paid on unverified webhooks.
            return response('Webhook secret not configured for this store', 400);
        }

        try {
            Webhook::constructEvent($payload, $signature, $webhookSecret);
        } catch (\Throwable $e) {
            Log::warning('Stripe webhook verification failed', ['order_number' => $orderNumber]);
            return response('Signature verification failed', 400);
        }

        if (($event['type'] ?? null) === 'checkout.session.completed') {
            $session = $object;
            $this->markOrderPaid($order, 'stripe', $session['payment_intent'] ?? $session['id'], [
                'stripe_session_id' => $session['id'],
                'stripe_payment_intent' => $session['payment_intent'] ?? null,
            ]);
        }

        return response('OK', 200);
    }

    public function paypal(Request $request)
    {
        $payload = $request->getContent();
        $event = json_decode($payload, true);

        $related = $event['resource']['supplementary_data']['related_ids'] ?? [];
        $paypalOrderId = $related['order_id'] ?? null;
        if (!$paypalOrderId) {
            return response('OK', 200);
        }

        $order = Order::where('payment_transaction_id', $paypalOrderId)->first();
        if (!$order) {
            return response('OK', 200); // Webhook for some other merchant account.
        }

        $config = getPaymentMethodConfig('paypal', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['client_id'] || !$config['secret'] || !$config['webhook_id']) {
            return response('PayPal webhook not configured for this store', 400);
        }

        if (!$this->verifyPayPalSignature($config, $request, $event)) {
            return response('Signature verification failed', 400);
        }

        if (in_array($event['event_type'] ?? '', [
            'PAYMENT.CAPTURE.COMPLETED',
            'CHECKOUT.ORDER.APPROVED',
        ], true)) {
            $this->markOrderPaid($order, 'paypal', $paypalOrderId, [
                'paypal_order_id' => $paypalOrderId,
                'paypal_event' => $event['event_type'] ?? null,
                'paypal_capture_id' => $event['resource']['id'] ?? null,
            ]);
        }

        return response('OK', 200);
    }

    public function razorpay(Request $request)
    {
        $payload = $request->getContent();
        $event = json_decode($payload, true);

        $eventType = $event['event'] ?? '';
        $paymentEntity = $event['payload']['payment']['entity'] ?? [];

        // Only act on successful payment events
        if (!in_array($eventType, ['payment.captured', 'payment.authorized'], true)) {
            return response('OK', 200);
        }

        $razorpayOrderId = $paymentEntity['order_id'] ?? null;
        if (!$razorpayOrderId) {
            return response('OK', 200);
        }

        // Look up the order by razorpay_order_id stored in payment_details
        $order = Order::whereJsonContains('payment_details->razorpay_order_id', $razorpayOrderId)->first();
        if (!$order) {
            return response('OK', 200);
        }

        $config = getPaymentMethodConfig('razorpay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['key'] || !$config['secret']) {
            return response('Razorpay not configured for this store', 400);
        }

        // Verify webhook signature (HMAC-SHA256)
        $webhookSecret = $config['webhook_secret'] ?? $config['secret'] ?? null;
        if ($webhookSecret) {
            $signature = $request->header('X-Razorpay-Signature');
            if (!$signature) {
                return response('Missing X-Razorpay-Signature header', 400);
            }
            $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
            if (!hash_equals($expectedSignature, $signature)) {
                Log::warning('Razorpay webhook signature verification failed', ['order_id' => $order->id]);
                return response('Signature verification failed', 400);
            }
        }

        $this->markOrderPaid($order, 'razorpay', $paymentEntity['id'] ?? null, [
            'razorpay_order_id' => $razorpayOrderId,
            'razorpay_payment_id' => $paymentEntity['id'] ?? null,
            'razorpay_event' => $eventType,
        ]);

        return response('OK', 200);
    }

    private function verifyPayPalSignature(array $config, Request $request, array $event): bool
    {
        try {
            $headers = $request->headers;
            $base = ($config['mode'] ?? 'sandbox') === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            $body = [
                'auth_algo' => $headers->get('paypal-auth-algo'),
                'cert_url' => $headers->get('paypal-cert-url'),
                'transmission_id' => $headers->get('paypal-transmission-id'),
                'transmission_sig' => $headers->get('paypal-transmission-sig'),
                'transmission_time' => $headers->get('paypal-transmission-time'),
                'webhook_id' => $config['webhook_id'],
                'webhook_event' => $event,
            ];

            $response = \Illuminate\Support\Facades\Http::withBasicAuth($config['client_id'], $config['secret'])
                ->timeout(30)
                ->post($base . '/v1/notifications/verify-webhook-signature', $body);

            $data = $response->json();
            return ($data['verification_status'] ?? '') === 'SUCCESS';
        } catch (\Throwable $e) {
            Log::error('PayPal webhook signature verification error: ' . $e->getMessage());
            return false;
        }
    }
}
