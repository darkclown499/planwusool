<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckFeatureAccess
{
    /**
     * Handle an incoming request.
     *
     * Usage in routes:
     *   ->middleware('feature.access:chatgpt')        // redirect on web
     *   ->middleware('feature.access:chatgpt,json')   // 403 JSON on API
     */
    public function handle(Request $request, Closure $next, string $feature, string $responseType = 'redirect')
    {
        $user = auth()->user();
        
        if (!$user) {
            return $responseType === 'json'
                ? response()->json(['message' => 'Unauthenticated.'], 401)
                : redirect()->route('login');
        }

        // Super admin has full access
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Only company users need feature checks
        if ($user->type !== 'company') {
            $message = __('Access denied.');
            return $responseType === 'json'
                ? response()->json(['success' => false, 'message' => $message], 403)
                : redirect()->route('dashboard')->with('error', $message);
        }

        // Check feature access via canonical featureColumnMap
        $featureCheck = \App\Http\Middleware\CheckPlanAccess::checkFeatureAccess($user, $feature);
        if (!$featureCheck['allowed']) {
            return $responseType === 'json'
                ? response()->json(['success' => false, 'message' => $featureCheck['message']], 403)
                : redirect()->route('dashboard')->with('error', $featureCheck['message']);
        }

        return $next($request);
    }
}