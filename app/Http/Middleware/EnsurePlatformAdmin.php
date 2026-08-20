<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Restricts platform-level pages (global /settings, webhooks, system config)
 * to SuperAdmin / System Owners only. Merchants manage their own store via
 * /stores/{id}/* (designer, features, payments, erp, settings).
 */
class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user || (!$user->isSuperAdmin() && !$user->isAdmin())) {
            abort(403, 'This area is restricted to platform administrators.');
        }

        return $next($request);
    }
}