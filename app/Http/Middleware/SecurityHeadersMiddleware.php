<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeadersMiddleware
{
    /**
     * Apply hardened HTTP security headers to the response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $response instanceof Response) {
            return $response;
        }

        $headers = config('security');

        if (! empty($headers['x_frame_options'])) {
            $response->headers->set('X-Frame-Options', $headers['x_frame_options']);
        }

        if (! empty($headers['x_content_type_options'])) {
            $response->headers->set('X-Content-Type-Options', $headers['x_content_type_options']);
        }

        if (! empty($headers['referrer_policy'])) {
            $response->headers->set('Referrer-Policy', $headers['referrer_policy']);
        }

        if (! empty($headers['permissions_policy'])) {
            $response->headers->set('Permissions-Policy', $headers['permissions_policy']);
        }

        // HSTS only makes sense over HTTPS in production.
        if ($headers['hsts']['enabled'] && app()->isProduction() && $request->isSecure()) {
            $value = 'max-age=' . $headers['hsts']['max_age'];

            if ($headers['hsts']['include_subdomains']) {
                $value .= '; includeSubDomains';
            }

            $response->headers->set('Strict-Transport-Security', $value);
        }

        // CSP is only sent in production (or when explicitly forced), because
        // in local development the Vite dev server serves modules from a
        // different origin and `upgrade-insecure-requests` would break them,
        // leaving a blank page.
        $cspForced = $headers['csp']['force_in_local'] ?? false;

        if ($headers['csp']['enabled']
            && ! empty($headers['csp']['policy'])
            && (app()->isProduction() || $cspForced)) {
            $policy = $headers['csp']['policy'];

            // Replace nonce placeholder with actual nonce from CspNonceMiddleware
            $nonce = $request->attributes->get('csp_nonce');
            if ($nonce) {
                $policy = str_replace('{csp_nonce}', $nonce, $policy);
            }

            // The React SPA sets inline <style> attributes at runtime, which
            // a nonce (or a nonce+'unsafe-inline' mix) simply cannot allow.
            // Normalize style-src to always permit inline styles so the UI
            // renders regardless of the configured policy.
            $policy = $this->normalizeStyleSrc($policy);

            $response->headers->set('Content-Security-Policy', $policy);
        }

        return $response;
    }

    /**
     * Make style-src React-compatible: drop any nonces from the directive and
     * guarantee 'unsafe-inline' is present. CSP3 ignores 'unsafe-inline' when
     * a nonce is present in the same directive, so a leftover nonce would
     * still block every inline style attribute the framework applies.
     */
    protected function normalizeStyleSrc(string $policy): string
    {
        if (! preg_match('/style-src\s+[^;]*/', $policy, $match)) {
            return $policy;
        }

        $sources = preg_replace("/'nonce-[^']+'/", '', $match[0]);
        $sources = trim((string) preg_replace('/\s+/', ' ', $sources));

        if (! str_contains($sources, "'unsafe-inline'")) {
            $sources .= " 'unsafe-inline'";
        }

        return str_replace($match[0], $sources, $policy);
    }
}
