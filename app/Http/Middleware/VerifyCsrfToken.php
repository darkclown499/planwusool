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
        
        // API endpoints that need CSRF exemption (stateless API)
        'api/coupon/validate',
        'api/cart',
        'api/cart/*',
    ];
}