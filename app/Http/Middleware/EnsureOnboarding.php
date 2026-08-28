<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboarding
{
    /**
     * Redirect company users who have not completed onboarding yet.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Super admin viewing the store through impersonation must not be
        // forced through the onboarding wizard regardless of the target
        // user's onboarding state.
        if (session('impersonated_by')) {
            return $next($request);
        }

        if ($user && $user->type === 'company' && $user->onboarded_at === null) {
            // The onboarding wizard itself needs authenticated API / JSON calls
            // (e.g. logo upload + media library listing), so only full page
            // navigations are redirected back to the wizard. JSON/API requests
            // pass through so their own auth + permission middleware decide.
            if ($request->expectsJson()) {
                return $next($request);
            }

            return redirect()->route('onboarding');
        }

        return $next($request);
    }
}
