<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ShareGlobalSettings;
use App\Http\Middleware\ShareStoresData;
use App\Http\Middleware\CheckInstallation;
use App\Http\Middleware\DemoModeMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(
            // '*' trusts every proxy so that scheme/host/port are resolved
            // from Cloudflare's X-Forwarded-* headers (otherwise OAuth
            // callback URLs are generated as http:// and Google/Apple/GitHub
            // reject them with redirect_uri_mismatch). NOTE: this runs at
            // bootstrap before the config repository is bound, so a config
            // value cannot be read here; use env() with a safe default.
            at: env('TRUSTED_PROXIES', '*'),
            headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB
        );

        $middleware->web(append: [
            CheckInstallation::class,
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
            'onboarded' => \App\Http\Middleware\EnsureOnboarding::class,
            'webhook.signature' => \App\Http\Middleware\VerifyWebhookSignature::class,
            'api.throttle' => \App\Http\Middleware\ApiRateLimiter::class,
            'security.headers' => \App\Http\Middleware\SecurityHeadersMiddleware::class,
        ]);

        $middleware->validateCsrfTokens(
        except: [
            'install/*',
            'update/*',
            'auth/callback/*',
            'cashfree/create-session', 
            'cashfree/webhook',
            'ozow/create-payment',
            'payments/easebuzz/success',
            'payments/aamarpay/success',
            'payments/aamarpay/callback',
            'payments/tap/success',
            'payments/tap/callback',
            'payments/benefit/success',
            'payments/benefit/callback',
            'payments/paytabs/callback',

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
            ],
        );

    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
