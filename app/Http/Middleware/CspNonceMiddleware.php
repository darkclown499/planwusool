<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class CspNonceMiddleware
{
    /**
     * The header name for the CSP nonce.
     */
    public const NONCE_HEADER = 'X-CSP-Nonce';

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Generate a cryptographically secure nonce for this request
        $nonce = base64_encode(random_bytes(16));

        // Store nonce in request for use in views
        $request->attributes->set('csp_nonce', $nonce);

        $response = $next($request);

        // Add nonce to response header for debugging/verification
        $response->headers->set(self::NONCE_HEADER, $nonce);

        // If CSP is enabled and we have a CSP header, inject the nonce
        if ($this->shouldInjectNonce($response)) {
            $this->injectNonceIntoCsp($response, $nonce);
        }

        return $response;
    }

    /**
     * Determine if we should inject nonce into CSP header.
     */
    protected function shouldInjectNonce(Response $response): bool
    {
        $cspHeader = $response->headers->get('Content-Security-Policy');
        
        if (!$cspHeader) {
            return false;
        }

        // Only inject if CSP contains 'nonce-' placeholder or unsafe-inline
        return str_contains($cspHeader, 'nonce-') 
            || str_contains($cspHeader, "'unsafe-inline'");
    }

    /**
     * Inject the nonce into the CSP header.
     */
    protected function injectNonceIntoCsp(Response $response, string $nonce): void
    {
        $cspHeader = $response->headers->get('Content-Security-Policy');
        
        // Replace 'nonce-{placeholder}' or add nonce to script-src/style-src
        $directives = [
            'script-src',
            'style-src',
        ];

        foreach ($directives as $directive) {
            if (str_contains($cspHeader, $directive)) {
                // Check if nonce is already present for this directive
                if (!preg_match("/{$directive}.*nonce-{$nonce}/", $cspHeader)) {
                    // Replace 'unsafe-inline' with nonce for this directive
                    $cspHeader = preg_replace(
                        "/({$directive}\s+[^;]*?)'unsafe-inline'/",
                        "$1'nonce-{$nonce}'",
                        $cspHeader
                    );
                    
                    // If no unsafe-inline was found, append nonce to directive
                    if (!preg_match("/{$directive}.*nonce-{$nonce}/", $cspHeader)) {
                        $cspHeader = preg_replace(
                            "/({$directive}\s+[^;]*?)(;|$)/",
                            "$1 'nonce-{$nonce}'$2",
                            $cspHeader
                        );
                    }
                }
            }
        }

        $response->headers->set('Content-Security-Policy', $cspHeader);
    }

    /**
     * Get the CSP nonce for the current request.
     */
    public static function getNonce(Request $request): ?string
    {
        return $request->attributes->get('csp_nonce');
    }
}