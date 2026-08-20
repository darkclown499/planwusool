<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ShareGlobalSettings;
use App\Http\Middleware\ShareStoresData;
use App\Http\Middleware\CheckInstallation;
use App\Http\Middleware\DemoModeMiddleware;
use App\Http\Middleware\CspNonceMiddleware;
use App\Providers\ServicesServiceProvider;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([
        ServicesServiceProvider::class,
    ])
    ->withMiddleware(function (Middleware $middleware) {
        // Restrict trusted proxies to specific IPs (comma-separated in the
        // TRUSTED_PROXIES env var) instead of trusting '*' — otherwise any
        // client can spoof X-Forwarded-* headers (scheme/host/port) and
        // generate malicious redirect URLs or poison chains.
        //
        // Default '127.0.0.1' covers the common aaPanel/nginx single-server
        // deployment where php-fpm only ever receives requests from the local
        // nginx reverse proxy, while still letting nginx's X-Forwarded-Proto
        // (set from Cloudflare or the real client) produce https: URLs.
        //
        // NOTE: this runs at bootstrap before the config repository is bound,
        // so a config value cannot be read here; use env() with a safe default.
        $trustedProxies = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('TRUSTED_PROXIES', '127.0.0.1'))
        )));

        $middleware->trustProxies(
            at: $trustedProxies,
            headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB
        );

        $middleware->web(append: [
            CheckInstallation::class,
            // MUST run before HandleInertiaRequests so the generated nonce is
            // available when cspNonce is shared to the frontend (otherwise the
            // inline <script>/<style> tags render without a nonce and the
            // strict CSP blocks them all, causing a blank page).
            CspNonceMiddleware::class,
            \App\Http\Middleware\DomainResolver::class,
            ShareGlobalSettings::class,
            ShareStoresData::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            DemoModeMiddleware::class,
            \App\Http\Middleware\SecurityHeadersMiddleware::class,
        ]);
        
        $middleware->api(append: [
            \App\Http\Middleware\DomainResolver::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'landing.enabled' => \App\Http\Middleware\CheckLandingPageEnabled::class,
            'registration.enabled' => \App\Http\Middleware\CheckRegistrationEnabled::class,
            'verified' => App\Http\Middleware\EnsureEmailIsVerified::class,
            'plan.access' => \App\Http\Middleware\CheckPlanAccess::class,
            'feature.access' => \App\Http\Middleware\CheckFeatureAccess::class,
            'store.status' => \App\Http\Middleware\CheckStoreStatus::class,
            'store.owner' => \App\Http\Middleware\EnsureStoreOwner::class,
            'platform.admin' => \App\Http\Middleware\EnsurePlatformAdmin::class,
            'onboarded' => \App\Http\Middleware\EnsureOnboarding::class,
            'webhook.signature' => \App\Http\Middleware\VerifyWebhookSignature::class,
            'api.throttle' => \App\Http\Middleware\ApiRateLimiter::class,
            'security.headers' => \App\Http\Middleware\SecurityHeadersMiddleware::class,
            'csp.nonce' => \App\Http\Middleware\CspNonceMiddleware::class,
        ]);

        $middleware->validateCsrfTokens(
        except: [
            'install/*',
            'update/*',
            'auth/callback/*',
            'cashfree/webhook',

            // Plan subscription payment callbacks and webhooks - these are
            // server-to-server POSTs from payment gateways (no CSRF token).
            'mercadopago/webhook',
            'payments/coingate/callback',
            'payments/skrill/callback',
            'payments/mollie/callback',
            'payments/toyyibpay/callback',
            'payments/iyzipay/callback',
            'payments/ozow/callback',
            'payments/payhere/callback',
            'payments/cinetpay/callback',
            'payments/paiement/callback',
            'payments/midtrans/callback',
            'payments/fedapay/callback',
            'payments/payfast/callback',
            'payments/xendit/callback',
            'payments/paytr/callback',
            'payments/nepalste/callback',
            'payments/yookassa/callback',

            // Store subdomain callback/webhook routes (payment gateways POST
            // without a CSRF token).
            'store-cashfree/webhook',
            'skrill/callback',
            'coingate/callback',
            'midtrans/callback',
            'mollie/callback',
            'benefit/callback',
            'yookassa/callback',
            'skrill/success/*',
            'coingate/success/*',
            'mollie/success/*',
            'benefit/success/*',
            'yookassa/success/*',
            'paytabs/callback/*',
            'tap/callback/*',
            'payfast/callback/*',
            'paytr/callback/*',
            'iyzipay/callback/*',
            'khalti/callback/*',
            'easebuzz/callback/*',
            'ozow/callback/*',
            'fedapay/callback/*',
            'payhere/callback/*',
            'cinetpay/callback/*',
            'nepalste/callback/*',
            'paiement/callback/*',
            'aamarpay/callback/*',
            'payhere/success/*',
            'cinetpay/success/*',
            'paiement/success/*',
            'easebuzz/success/*',
            'aamarpay/success/*',
            'toyyibpay/success/*',
            'store/stripe/webhook',
            'store/paypal/webhook',
            'store/paystack/webhook',
            'store/mercadopago/webhook',
            ],
        );

    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Unauthenticated Inertia (SPA) requests must be redirected to the
        // login page (HTTP 302), otherwise the SPA hangs on a plain redirect
        // instead of following it, or worse receives a JSON 401 body and
        // throws an "Inertia.js response error". API/JSON and regular browser
        // requests keep the framework's default handling (401 JSON / 302 redirect).
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->hasHeader('X-Inertia')) {
                return redirect()->guest(route('login'));
            }
        });
    })->create();
