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
     *
     * These are stored per-gateway (optionally per-tenant via the settings
     * tables). A missing/services.*.webhook_secret config value falls back to
     * the merchant's payment settings (secret/signature key), so signed
     * webhooks keep working without editing config files per tenant.
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
     * Map of gateway => settings key used as the webhook signing secret when
     * no services.*.webhook_secret config value is set. Kept in sync with
     * getPaymentMethodConfig()/EncryptsSensitiveSettings key names.
     */
    protected static array $settingsSecretKeys = [
        'stripe'       => 'stripe_secret',
        'paypal'       => 'paypal_secret_key',
        'razorpay'     => 'razorpay_secret',
        'cashfree'     => 'cashfree_secret_key',
        'mercadopago'  => 'mercadopago_access_token',
        'skrill'       => 'skrill_secret_word',
        'coingate'     => 'coingate_api_token',
        'midtrans'     => 'midtrans_secret_key',
        'yookassa'     => 'yookassa_secret_key',
        'benefit'      => 'benefit_secret_key',
        'ozow'         => 'ozow_private_key',
        'payfast'      => 'payfast_passphrase',
        'tap'          => 'tap_secret_key',
        'aamarpay'     => 'aamarpay_signature',
        'payhere'      => 'payhere_merchant_secret',
        'cinetpay'     => 'cinetpay_secret_key',
        'paiement'     => 'paiement_merchant_secret',
        'nepalste'     => 'nepalste_secret_key',
        'xendit'       => 'xendit_api_key',
        'mollie'       => 'mollie_api_key',
        'toyyibpay'    => 'toyyibpay_secret_key',
        'iyzipay'      => 'iyzipay_secret_key',
        'khalti'       => 'khalti_secret_key',
        'easebuzz'     => 'easebuzz_salt_key',
        'fedapay'      => 'fedapay_secret_key',
        'authorizenet' => 'authorizenet_transaction_key',
        'paytr'        => 'paytr_merchant_salt',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $gateway): Response
    {
        // Gateways in this list apply their own gateway-specific signature
        // algorithm inside the controller (Midtrans SHA512 body signature,
        // PayFast ITN md5sig, Cashfree base64(timestamp+body), PayTabs v2
        // HMAC, Razorpay HMAC-base64, Benefit X-Benefit-Signature). The
        // shared middleware cannot reproduce those blindly, so it defers the
        // signature check to the controller which MUST verify before acting.
        if (static::$deferredToController[$gateway] ?? false) {
            return $next($request);
        }

        $secretKey = $this->resolveSecret($gateway, $request);

        // Gather the signature from the header(s) the gateway actually sends.
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

        if (!$secretKey) {
            // Signature present but no secret we can verify against. Fail
            // closed rather than silently accepting an unsigned webhook.
            abort(403, 'Webhook signature verification failed: no secret configured.');
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
     * Gateways whose signature algorithms are verified inside their own
     * controllers (server-to-server API retrieval or gateway-specific
     * formulas the shared middleware cannot generically reproduce). The
     * controller MUST verify; otherwise the webhook is rejected for these.
     *
     * Gateways NOT listed here are authenticated by the middleware itself
     * (HMAC/Stripe-style) and fail closed when no signature/secret exists.
     *
     * @var array<string, bool>
     */
    protected static array $deferredToController = [
        // Server-side API retrieval before approving anything.
        'coingate'    => true, // fetches the order from api.coingate.com
        'mollie'      => true, // fetches the payment + isPaid() server-side
        'khalti'      => true, // verifyKhaltiPayment() via Khalti API
        'tap'         => true, // getCharge() via Tap API before success
        'mercadopago' => true, // retrieves the payment server-side on webhook
        'aamarpay'    => true, // verified against the gateway query API instead
        'yookassa'    => true, // getPaymentInfo() server-side before approving
        'paystack'    => true, // verifies the transaction via api.paystack.co

        // Gateway-specific signing implemented in the controller.
        'payfast'     => true, // md5sig ITN signature
        'paytabs'     => true, // HMAC-SHA256 v2 over sorted, lowercased params
        'skrill'      => true, // md5sig POST field
        'cashfree'    => true, // base64(HMAC(timestamp + rawBody)) in controller
        'razorpay'    => true, // HMAC base64 of order_id|payment_id|amount
        'midtrans'    => true, // SHA512(order_id.status_code.gross_amount) in body
        'benefit'     => true, // X-Benefit-Signature logic lives in the controller
        'easebuzz'    => true, // easebuzzResponse() with merchant key + salt
        'paytr'       => true, // HMAC token verification in the controller
    ];

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

    /**
     * Resolve the signing secret for a gateway:
     *  1. explicit services.<gateway>.webhook_secret config value;
     *  2. otherwise the merchant's stored payment settings key (the store
     *     owner / superadmin secret configured in the dashboard).
     *
     * @return string|null
     */
    protected function resolveSecret(string $gateway, Request $request): ?string
    {
        $configKey = static::$secretKeys[$gateway] ?? "services.{$gateway}.webhook_secret";
        $secret = config($configKey);

        if (is_string($secret) && $secret !== '') {
            return $secret;
        }

        $settingsKey = static::$settingsSecretKeys[$gateway] ?? null;
        if ($settingsKey) {
            try {
                $settings = getPaymentSettings($this->resolveSettingsUserId($request));
                $secret = $settings[$settingsKey] ?? null;
                if (is_string($secret) && $secret !== '') {
                    return $secret;
                }
            } catch (\Throwable $e) {
                // settings table may not exist during install; fail closed below
            }
        }

        return null;
    }

    /**
     * Prefer the authenticated store owner when present, otherwise fall back
     * to the platform's superadmin payment settings (the tenant-agnostic
     * fallback used by all plan-level callbacks).
     */
    protected function resolveSettingsUserId(Request $request): ?int
    {
        if (auth('customer')->user()?->id) {
            $store = $request->route('store');

            if ($store && $store->user_id) {
                return (int) $store->user_id;
            }
        }

        $user = $request->user();

        if ($user && $user->type !== 'company') {
            return $user->type === 'superadmin' ? (int) $user->id : (int) ($user->created_by ?? $user->id);
        }

        $superAdmin = \App\Models\User::where('type', 'superadmin')->first();

        return $superAdmin ? (int) $superAdmin->id : null;
    }
}
