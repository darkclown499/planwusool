<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Security Headers
    |--------------------------------------------------------------------------
    |
    | Hardened HTTP response headers applied by the SecurityHeadersMiddleware
    | to every web response (dashboard, storefronts, landing page). Each value
    | is configurable through environment variables so an operator can relax a
    | header without changing code.
    |
    */

    // X-Frame-Options: prevents clickjacking by telling browsers this app may
    // not be embedded in a frame on another origin. 'SAMEORIGIN' allows frames
    // from the same origin (e.g. admin previews); use 'DENY' for the strictest
    // policy; set to '' to disable the header.
    'x_frame_options' => env('SECURITY_X_FRAME_OPTIONS', 'SAMEORIGIN'),

    // X-Content-Type-Options: stops browsers from MIME-type sniffing responses.
    'x_content_type_options' => env('SECURITY_X_CONTENT_TYPE_OPTIONS', 'nosniff'),

    // Referrer-Policy: controls what is leaked in the Referer header when
    // users navigate away from the app.
    'referrer_policy' => env('SECURITY_REFERRER_POLICY', 'strict-origin-when-cross-origin'),

    // Permissions-Policy: disables browser features the app never uses.
    'permissions_policy' => env('SECURITY_PERMISSIONS_POLICY', 'geolocation=(), microphone=(), camera=()'),

    // Strict-Transport-Security is only emitted over HTTPS in production, so
    // local/HTTP development is never affected.
    'hsts' => [
        'enabled' => env('SECURITY_HSTS_ENABLED', true),
        'max_age' => (int) env('SECURITY_HSTS_MAX_AGE', 31536000), // 1 year
        'include_subdomains' => env('SECURITY_HSTS_INCLUDE_SUBDOMAINS', true),
    ],

    // Content-Security-Policy. The default policy is deliberately permissive
    // enough for the full feature set (payment SDKs, Google Fonts, inline
    // theme scripts, Vite) while still blocking object / base-tag / frame
    // injection and forcing HTTPS upgrades. Override SECURITY_CSP to lock it
    // down further for a specific deployment.
    //
    // CSP is only emitted in production by default. In local development the
    // Vite dev server serves modules from a different origin (e.g.
    // http://127.0.0.1:5173) and the `upgrade-insecure-requests` directive
    // would force those http:// requests to https://, so the browser blocks
    // them and the app renders a blank page. Set SECURITY_CSP_FORCE_LOCAL=true
    // if you want CSP in local too (you must then whitelist your Vite origin
    // in the policy).
    'csp' => [
        'enabled' => env('SECURITY_CSP_ENABLED', true),
        'force_in_local' => env('SECURITY_CSP_FORCE_LOCAL', false),
        // Use nonce placeholders that CspNonceMiddleware will replace with actual nonces
        'policy' => env('SECURITY_CSP', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; upgrade-insecure-requests; img-src 'self' data: blob: https: http:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'nonce-{csp_nonce}' https: http:; connect-src 'self' https: wss: ws:; frame-src 'self' https:; form-action 'self' https:"),
    ],

];
