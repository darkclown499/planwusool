<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimiter
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $key = $this->resolveRequestSignature($request);
        $maxAttempts = 60;
        $decayMinutes = 1;

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            return $this->buildRateLimitResponse($key, $maxAttempts);
        }

        RateLimiter::hit($key, $decayMinutes * 60);

        $response = $next($request);

        return $this->addRateLimitHeaders($response, $key, $maxAttempts);
    }

    /**
     * Resolve request signature for rate limiting.
     */
    protected function resolveRequestSignature(Request $request): string
    {
        $ip = $request->ip();
        $storeSlug = $request->route('storeSlug') ?? 'global';
        $route = $request->route()->uri() ?? 'unknown';

        return "{$ip}|{$storeSlug}|{$route}";
    }

    /**
     * Build rate limit exceeded response.
     */
    protected function buildRateLimitResponse(string $key, int $maxAttempts): Response
    {
        $seconds = RateLimiter::availableIn($key);

        return response()->json([
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $seconds,
        ], 429)->withHeaders([
            'Retry-After' => $seconds,
            'X-RateLimit-Limit' => 60,
            'X-RateLimit-Remaining' => 0,
            'X-RateLimit-Reset' => time() + $seconds,
        ]);
    }

    /**
     * Add rate limit headers to response.
     */
    protected function addRateLimitHeaders(Response $response, string $key, int $maxAttempts): Response
    {
        return $response->withHeaders([
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => RateLimiter::remaining($key, $maxAttempts),
            'X-RateLimit-Reset' => time() + RateLimiter::availableIn($key),
        ]);
    }
}