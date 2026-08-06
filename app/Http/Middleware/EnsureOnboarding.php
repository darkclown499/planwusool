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
            return redirect()->route('onboarding');
        }

        return $next($request);
    }
}
