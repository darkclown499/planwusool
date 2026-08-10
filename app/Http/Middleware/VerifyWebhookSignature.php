<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to verify the signature of incoming webhook requests.
 *
 * This approach is safer than blindly disabling CSRF protection for
 * entire route patterns. Each payment gateway is configured with its
 * own webhook secret, and the signature is validated against the
 * request body using HMAC.
 *
 * Usage in routes:
 *   Route::post('stripe/webhook', ...)->middleware('webhook.signature:stripe');
 */
class VerifyWebhookSignature
{
    /**
     * Map of gateway => secret config key.
     */
    protected static array $secretKeys = [
        'stripe'       => 'services.stripe.webhook_secret',
        'paypal'       => 'services.paypal.webhook_secret',
        'razorpay'     => 'services.razorpay.webhook_secret',
        'cashfree'     => 'services.cashfree.webhook_secret',
        'mercadopago'  => 'services.mercadopago.webhook_secret',
        'skrill'       => 'services.skrill.webhook_secret',
        'coingate'     => 'services.coingate.webhook_secret',
        'midtrans'     => 'services.midtrans.webhook_secret',
        'yookassa'     => 'services.yookassa.webhook_secret',
        'benefit'      => 'services.benefit.webhook_secret',
        'ozow'         => 'services.ozow.webhook_secret',
        'payfast'      => 'services.payfast.webhook_secret',
        'tap'          => 'services.tap.webhook_secret',
        'aamarpay'     => 'services.aamarpay.webhook_secret',
        'payhere'      => 'services.payhere.webhook_secret',
        'cinetpay'     => 'services.cinetpay.webhook_secret',
        'paiement'     => 'services.paiement.webhook_secret',
        'nepalste'     => 'services.nepalste.webhook_secret',
        'xendit'       => 'services.xendit.webhook_secret',
        'mollie'       => 'services.mollie.webhook_secret',
        'toyyibpay'    => 'services.toyyibpay.webhook_secret',
        'iyzipay'      => 'services.iyzipay.webhook_secret',
        'khalti'       => 'services.khalti.webhook_secret',
        'easebuzz'     => 'services.easebuzz.webhook_secret',
        'fedapay'      => 'services.fedapay.webhook_secret',
        'authorizenet' => 'services.authorizenet.webhook_secret',
        'paytr'        => 'services.paytr.webhook_secret',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $gateway): Response
    {
        $secretKey = config(static::$secretKeys[$gateway] ?? "services.{$gateway}.webhook_secret");

        if (!$secretKey) {
            // If no secret is configured, reject the request.
            // This is safer than silently accepting unsigned webhooks.
            abort(403, 'Webhook signature verification failed: no secret configured.');
        }

        $signature = $request->header('X-Signature')
            ?? $request->header('Stripe-Signature')
            ?? $request->header('X-Razorpay-Signature')
            ?? $request->header('X-PayPal-Transmission-Sig')
            ?? $request->header('X-MercadoPago-Signature')
            ?? $request->header('X-CoinGate-Signature')
            ?? $request->header('X-Midtrans-Signature')
            ?? $request->header('X-Callback-Signature');

        if (!$signature) {
            abort(403, 'Webhook signature verification failed: no signature provided.');
        }

        $payload = $request->getContent();

        // Try common HMAC verification methods.
        $verified = $this->verifyHmac($signature, $payload, $secretKey, $gateway);

        if (!$verified) {
            abort(403, 'Webhook signature verification failed.');
        }

        return $next($request);
    }

    /**
     * Attempt to verify the signature using methods common to most gateways.
     */
    protected function verifyHmac(string $signature, string $payload, string $secret, string $gateway): bool
    {
        // Stripe-style: t=<timestamp>,v1=<signature>
        if ($gateway === 'stripe' && str_starts_with($signature, 't=')) {
            return $this->verifyStripeSignature($signature, $payload, $secret);
        }

        // Razorpay-style: signature in header, HMAC of payload + secret
        $expected = hash_hmac('sha256', $payload, $secret, false);

        // Compare the raw signature or the first part of it
        return hash_equals($expected, $signature)
            || hash_equals($expected, explode('.', $signature)[0] ?? '');
    }

    /**
     * Verify a Stripe-style signed payload.
     */
    protected function verifyStripeSignature(string $signatureHeader, string $payload, string $secret): bool
    {
        $timestamp = null;
        $signatures = [];

        foreach (explode(',', $signatureHeader) as $item) {
            [$key, $value] = explode('=', trim($item), 2);
            if ($key === 't') {
                $timestamp = (int) $value;
            } elseif ($key === 'v1') {
                $signatures[] = $value;
            }
        }

        if (!$timestamp) {
            return false;
        }

        // Allow a 5-minute tolerance for clock drift
        if (abs(time() - $timestamp) > 300) {
            return false;
        }

        $signedPayload = $timestamp . '.' . $payload;
        $expectedSignature = hash_hmac('sha256', $signedPayload, $secret, false);

        foreach ($signatures as $sig) {
            if (hash_equals($expectedSignature, $sig)) {
                return true;
            }
        }

        return false;
    }
}
