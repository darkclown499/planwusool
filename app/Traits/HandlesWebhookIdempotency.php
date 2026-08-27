<?php

namespace App\Traits;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

trait HandlesWebhookIdempotency
{
    /**
     * Default TTL for idempotency keys (24 hours).
     */
    protected int $idempotencyTtl = 86400;

    /**
     * Check if a webhook event has already been processed.
     *
     * @param  string  $gateway  The payment gateway name
     * @param  string  $eventId  The unique event ID from the gateway
     * @return bool  True if already processed, false otherwise
     */
    protected function isWebhookProcessed(string $gateway, string $eventId): bool
    {
        $key = $this->getIdempotencyKey($gateway, $eventId);
        
        return Cache::has($key);
    }

    /**
     * Mark a webhook event as processed.
     *
     * @param  string  $gateway  The payment gateway name
     * @param  string  $eventId  The unique event ID from the gateway
     * @param  mixed  $result  Optional result to store
     * @return void
     */
    protected function markWebhookProcessed(string $gateway, string $eventId, mixed $result = true): void
    {
        $key = $this->getIdempotencyKey($gateway, $eventId);
        
        Cache::put($key, $result, $this->idempotencyTtl);
    }

    /**
     * Process a webhook with idempotency protection.
     *
     * @param  Request  $request
     * @param  string  $gateway
     * @param  callable  $handler
     * @return mixed
     */
    protected function processWebhookIdempotently(Request $request, string $gateway, callable $handler): mixed
    {
        $eventId = $this->extractEventId($request, $gateway);

        if (!$eventId) {
            Log::warning("Webhook idempotency: Could not extract event ID for {$gateway}", [
                'gateway' => $gateway,
                'headers' => $request->headers->all(),
            ]);
            // Fail closed: without an event ID we cannot deduplicate atomically
            // Use body hash as idempotency key and enforce atomic add
            $fallbackId = $gateway . '_' . hash('sha256', $request->getContent());
            $key = $this->getIdempotencyKey($gateway, $fallbackId);
            if (!Cache::add($key, true, $this->idempotencyTtl)) {
                return response()->json(['status' => 'already_processed'], 200);
            }
            try {
                $result = $handler($request);
                Cache::put($key, $result, $this->idempotencyTtl);
                return $result;
            } catch (\Throwable $e) {
                Cache::forget($key);
                throw $e;
            }
        }

        $key = $this->getIdempotencyKey($gateway, $eventId);

        // Atomic claim: Cache::add only succeeds if key does not exist
        if (!Cache::add($key, 'processing', $this->idempotencyTtl)) {
            Log::info("Webhook idempotency: Duplicate event ignored for {$gateway}", [
                'gateway' => $gateway,
                'event_id' => $eventId,
            ]);
            $cached = Cache::get($key);
            if ($cached === 'processing') {
                return response()->json(['status' => 'already_processed'], 200);
            }
            return $cached ?? response()->json(['status' => 'already_processed'], 200);
        }

        try {
            $result = $handler($request);
            Cache::put($key, $result, $this->idempotencyTtl);
            return $result;
        } catch (\Throwable $e) {
            Cache::forget($key);
            throw $e;
        }
    }

    /**
     * Extract the unique event ID from the webhook request.
     * Override this method in controllers for gateway-specific extraction.
     */
    protected function extractEventId(Request $request, string $gateway): ?string
    {
        // Common patterns for different gateways
        $eventId = $request->header('X-Event-Id')
            ?? $request->header('Stripe-Event-Id')
            ?? $request->header('X-PayPal-Transmission-Id')
            ?? $request->header('X-Razorpay-Event-Id')
            ?? $request->header('X-MercadoPago-Event-Id')
            ?? $request->header('X-CoinGate-Event-Id')
            ?? $request->header('X-Midtrans-Event-Id')
            ?? $request->header('X-Mollie-Event-Id')
            ?? $request->header('X-Callback-Event-Id')
            ?? $request->input('event_id')
            ?? $request->input('id')
            ?? $request->input('event')
            ?? $request->input('data.id')
            ?? $request->input('resource.id');

        // For Stripe, the event ID is in the JSON body
        if ($gateway === 'stripe') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'stripe_' . $payload['id'];
            }
        }

        // For PayPal, the event ID is in the transmission header
        if ($gateway === 'paypal') {
            $transmissionId = $request->header('PayPal-Transmission-Id');
            if ($transmissionId) {
                return 'paypal_' . $transmissionId;
            }
        }

        // For Razorpay, the event ID is in the body
        if ($gateway === 'razorpay') {
            $payload = $request->json()->all();
            if (isset($payload['event'])) {
                return 'razorpay_' . $payload['event'];
            }
        }

        // For MercadoPago, the event ID is in the body
        if ($gateway === 'mercadopago') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'mercadopago_' . $payload['id'];
            }
        }

        // For Cashfree, the event ID is in the body
        if ($gateway === 'cashfree') {
            $payload = $request->json()->all();
            if (isset($payload['event_id'])) {
                return 'cashfree_' . $payload['event_id'];
            }
        }

        // For PayTabs, the event ID is in the body
        if ($gateway === 'paytabs') {
            $payload = $request->json()->all();
            if (isset($payload['tran_ref'])) {
                return 'paytabs_' . $payload['tran_ref'];
            }
        }

        // For Flutterwave, the event ID is in the body
        if ($gateway === 'flutterwave') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'flutterwave_' . $payload['id'];
            }
        }

        // For Mollie, the event ID is in the body
        if ($gateway === 'mollie') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'mollie_' . $payload['id'];
            }
        }

        // For Benefit, the event ID is in the body
        if ($gateway === 'benefit') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'benefit_' . $payload['id'];
            }
        }

        // For YooKassa, the event ID is in the body
        if ($gateway === 'yookassa') {
            $payload = $request->json()->all();
            if (isset($payload['event_id'])) {
                return 'yookassa_' . $payload['event_id'];
            }
        }

        // For Xendit, the event ID is in the body
        if ($gateway === 'xendit') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'xendit_' . $payload['id'];
            }
        }

        // For PayTR, the event ID is in the body
        if ($gateway === 'paytr') {
            $payload = $request->json()->all();
            if (isset($payload['merchant_oid'])) {
                return 'paytr_' . $payload['merchant_oid'];
            }
        }

        // For PayFast, the event ID is in the body
        if ($gateway === 'payfast') {
            $payload = $request->json()->all();
            if (isset($payload['pf_payment_id'])) {
                return 'payfast_' . $payload['pf_payment_id'];
            }
        }

        // For CoinGate, the event ID is in the body
        if ($gateway === 'coingate') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'coingate_' . $payload['id'];
            }
        }

        // For Midtrans, the event ID is in the body
        if ($gateway === 'midtrans') {
            $payload = $request->json()->all();
            if (isset($payload['order_id'])) {
                return 'midtrans_' . $payload['order_id'];
            }
        }

        // For iyzico, the event ID is in the body
        if ($gateway === 'iyzipay') {
            $payload = $request->json()->all();
            if (isset($payload['token'])) {
                return 'iyzipay_' . $payload['token'];
            }
        }

        // For PayHere, the event ID is in the body
        if ($gateway === 'payhere') {
            $payload = $request->json()->all();
            if (isset($payload['payment_id'])) {
                return 'payhere_' . $payload['payment_id'];
            }
        }

        // For CinetPay, the event ID is in the body
        if ($gateway === 'cinetpay') {
            $payload = $request->json()->all();
            if (isset($payload['cpm_trans_id'])) {
                return 'cinetpay_' . $payload['cpm_trans_id'];
            }
            if (isset($payload['transaction_id'])) {
                return 'cinetpay_' . $payload['transaction_id'];
            }
        }

        // For Paiement, the event ID is in the body
        if ($gateway === 'paiement') {
            $payload = $request->json()->all();
            if (isset($payload['reference'])) {
                return 'paiement_' . $payload['reference'];
            }
            if (isset($payload['transaction_id'])) {
                return 'paiement_' . $payload['transaction_id'];
            }
        }

        // For FedaPay, the event ID is in the body
        if ($gateway === 'fedapay') {
            $payload = $request->json()->all();
            if (isset($payload['event_id'])) {
                return 'fedapay_' . $payload['event_id'];
            }
        }

        // For PayTR, the event ID is in the body
        if ($gateway === 'paytr') {
            $payload = $request->json()->all();
            if (isset($payload['merchant_oid'])) {
                return 'paytr_' . $payload['merchant_oid'];
            }
        }

        // For Aamarpay, the event ID is in the body
        if ($gateway === 'aamarpay') {
            $payload = $request->json()->all();
            if (isset($payload['mer_txnid'])) {
                return 'aamarpay_' . $payload['mer_txnid'];
            }
        }

        // For Tap, the event ID is in the body
        if ($gateway === 'tap') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'tap_' . $payload['id'];
            }
        }

        // For Ozow, the event ID is in the body
        if ($gateway === 'ozow') {
            $payload = $request->json()->all();
            if (isset($payload['id'])) {
                return 'ozow_' . $payload['id'];
            }
        }

        // For Easebuzz, the event ID is in the body
        if ($gateway === 'easebuzz') {
            $payload = $request->json()->all();
            if (isset($payload['txnid'])) {
                return 'easebuzz_' . $payload['txnid'];
            }
        }

        // For Khalti, the event ID is in the body
        if ($gateway === 'khalti') {
            $payload = $request->json()->all();
            if (isset($payload['idx'])) {
                return 'khalti_' . $payload['idx'];
            }
        }

        // For Authorize.Net, the event ID is in the body
        if ($gateway === 'authorizenet') {
            $payload = $request->json()->all();
            if (isset($payload['transId'])) {
                return 'authorizenet_' . $payload['transId'];
            }
        }

        // For Skrill, the event ID is in the body
        if ($gateway === 'skrill') {
            $payload = $request->json()->all();
            if (isset($payload['transaction_id'])) {
                return 'skrill_' . $payload['transaction_id'];
            }
        }

        // For ToyyibPay, the event ID is in the body
        if ($gateway === 'toyyibpay') {
            $payload = $request->json()->all();
            if (isset($payload['billcode'])) {
                return 'toyyibpay_' . $payload['billcode'];
            }
        }

        // For Nepalste, the event ID is in the body
        if ($gateway === 'nepalste') {
            $payload = $request->json()->all();
            if (isset($payload['purchase_order_id'])) {
                return 'nepalste_' . $payload['purchase_order_id'];
            }
            if (isset($payload['transaction_id'])) {
                return 'nepalste_' . $payload['transaction_id'];
            }
        }

        // For custom gateways, try common fields
        if ($eventId) {
            return $gateway . '_' . $eventId;
        }

        // Fallback: use a hash of the request body for unknown gateways
        $body = $request->getContent();
        if ($body) {
            return $gateway . '_' . hash('sha256', $body);
        }

        return null;
    }

    /**
     * Generate the cache key for idempotency.
     */
    protected function getIdempotencyKey(string $gateway, string $eventId): string
    {
        return "webhook_idempotency:{$gateway}:{$eventId}";
    }

    /**
     * Set the TTL for idempotency keys (default 24 hours).
     */
    public function setIdempotencyTtl(int $seconds): self
    {
        $this->idempotencyTtl = $seconds;
        return $this;
    }
}