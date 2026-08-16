<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CspNonceMiddleware
{
    /**
     * The header name for the CSP nonce.
     */
    public const NONCE_HEADER = 'X-CSP-Nonce';

    /**
     * Handle an incoming request.
     *
     * Generates a per-request nonce, stores it on the request so the Inertia
     * props and Blade views can render it onto inline <script>/<style> tags,
     * and exposes it under a dedicated header for debugging. The final CSP
     * header itself is produced by SecurityHeadersMiddleware, which replaces
     * the {csp_nonce} placeholder; no header rewriting happens here.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = base64_encode(random_bytes(16));

        $request->attributes->set('csp_nonce', $nonce);

        $response = $next($request);

        $response->headers->set(self::NONCE_HEADER, $nonce);

        return $response;
    }

    /**
     * Get the CSP nonce for the current request.
     */
    public static function getNonce(Request $request): ?string
    {
        return $request->attributes->get('csp_nonce');
    }
}