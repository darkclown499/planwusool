<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        // Webhook endpoints only (external callbacks from payment gateways)
        'cashfree/webhook',
        'store/*/store-cashfree/webhook',
        'paystack/webhook',
        'flutterwave/webhook',
        'razorpay/webhook',
        'stripe/webhook',
        'paypal/webhook',
        'midtrans/webhook',
        'toyyibpay/webhook',
        'yookassa/webhook',
        'cinetpay/webhook',
        'benefit/webhook',
        'ozow/webhook',
        'easebuzz/webhook',
        'khalti/webhook',
        'authorizenet/webhook',
        'fedapay/webhook',
        'payhere/webhook',
        'mercadopago/webhook',
        'paytabs/webhook',
        'paytabs/callback',

        // Store subdomain callback/webhook routes (payment gateways POST
        // without a CSRF token). Laravel matches exceptions against the URI
        // path, so the subdomain path segment is matched as-is.
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
    ];
}