<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyDashboardOrigin
{
    /**
     * Paths exempt from Origin pinning. Mirrors the CSRF-exempt list: these are
     * server-to-server webhooks/callbacks or browser auto-redirects from third
     * parties that legitimately POST cross-origin without a CSRF token.
     */
    protected $except = [
        'api/*',
        'store/*',
        'webhook/*',
        'webhooks/whatsapp',
        'webhook/whatsapp',
        'store-cashfree/webhook',
        'cashfree/webhook',
        'install/*',
        'update/*',
        'auth/callback/*',
        'payments/*/callback',
        'skrill/callback',
        'coingate/callback',
        'midtrans/callback',
        'mollie/callback',
        'benefit/callback',
        'yookassa/callback',
        'paytabs/callback/*',
        'tap/callback/*',
        'payfast/callback/*',
        'paytr/callback/*',
        'iyzipay/callback/*',
        'khalti/callback/*',
        'easebuzz/callback/*',
        'ozow/callback/*',
        'authorizenet/callback/*',
        'fedapay/callback/*',
        'payhere/callback/*',
        'cinetpay/callback/*',
        'nepalste/callback/*',
        'paiement/callback/*',
        'aamarpay/callback/*',
        'skrill/success/*',
        'coingate/success/*',
        'mollie/success/*',
        'benefit/success/*',
        'yookassa/success/*',
        'payhere/success/*',
        'cinetpay/success/*',
        'paiement/success/*',
        'easebuzz/success/*',
        'aamarpay/success/*',
        'toyyibpay/success/*',
        'api/whatsapp/webhook',
    ];

    /**
     * Origin pinning for state-changing requests.
     *
     * Cross-subdomain CSRF is possible here because the session cookie is
     * shared across all {store}.{domain} storefronts (same-site), letting a
     * malicious store subdomain read the victim's non-HttpOnly XSRF token and
     * replay state-changing POSTs against the main app host. Pinning rejects
     * any state-changing request whose Origin host differs from the request
     * host, closing that vector while leaving same-origin browser flows and
     * non-browser clients (which omit Origin) untouched.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $method = $request->getMethod();

        if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        foreach ($this->except as $pattern) {
            if ($request->is($pattern)) {
                return $next($request);
            }
        }

        $origin = $request->headers->get('Origin');

        // Non-browser clients do not send an Origin header; rely on CSRF there.
        if ($origin === null || $origin === '') {
            return $next($request);
        }

        // Sandboxed/opaque origins can never legitimately drive our UI.
        if (strtolower(trim($origin)) === 'null') {
            return response()->json(['message' => 'Request origin denied.'], 403);
        }

        $originHost = parse_url($origin, PHP_URL_HOST);
        $requestHost = $request->getHost();

        if ($originHost === false || $originHost === null) {
            return $next($request);
        }

        if (strcasecmp($originHost, $requestHost) === 0) {
            return $next($request);
        }

        return response()->json(['message' => 'Request origin denied.'], 403);
    }
}