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

        if ($user && $user->type === 'company' && $user->onboarded_at === null) {
            // The onboarding wizard itself needs authenticated API / JSON calls
            // (e.g. logo upload through the media library), so only full page
            // navigations are redirected back to the wizard.
            if ($request->expectsJson()) {
                return $next($request);
            }

            return redirect()->route('onboarding');
        }

        return $next($request);
    }
}
