<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration enables CORS for API routes and store subdomain routes.
    | Store subdomains (e.g., store.wusool.ps) need to make API calls to the
    | main domain (wusool.ps) for cart, checkout, wishlist, etc.
    |
    */

    'paths' => [
        'api/*',
        'store/*',
        'webhook/*',
        'payments/*',
        'install/*',
        'update/*',
        'auth/callback/*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('APP_URL', 'http://localhost'),
        'https://*.' . env('APP_DOMAIN', 'localhost'),
        'http://*.' . env('APP_DOMAIN', 'localhost'),
    ],

    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.' . preg_quote(env('APP_DOMAIN', 'localhost'), '/') . '$/',
        '/^http:\/\/.*\.' . preg_quote(env('APP_DOMAIN', 'localhost'), '/') . '$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'Retry-After',
        'Content-Disposition',
    ],

    'max_age' => 86400,

    'supports_credentials' => true,
];