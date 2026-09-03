<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the dedicated POS terminal routes.
 *
 * Authenticates against the `pos_terminal` guard (a separate session from the
 * merchant `web` guard, so a cashier can never reach the merchant dashboard or
 * settings behind it). The terminal's CURRENT active state is validated from
 * the database on every request — not only from the session snapshot — so a
 * merchant who revokes/deactivates a terminal cuts off even an already
 * authenticated session on its next protected action.
 */
class EnsurePosTerminal
{
    public function handle(Request $request, Closure $next): Response
    {
        $terminal = Auth::guard('pos_terminal')->user();

        if (!$terminal) {
            if ($request->expectsJson() || $request->is('pos/terminal/api/*')) {
                return response()->json(['message' => 'غير مصرح به.'], 401);
            }
            if ($request->hasHeader('X-Inertia')) {
                return redirect()->guest(route('pos.terminal.login'));
            }
            return redirect()->route('pos.terminal.login');
        }

        // Reload the terminal from the DB and gravely reject a revoked/deactivated
        // terminal even if it still holds a live session.
        $fresh = $terminal->fresh();
        if (!$fresh || !$fresh->is_active) {
            Auth::guard('pos_terminal')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            if ($request->expectsJson() || $request->is('pos/terminal/api/*')) {
                return response()->json(['message' => 'غير مصرح به.'], 401);
            }
            return redirect()->route('pos.terminal.login');
        }

        // Share the terminal context for Inertia terminal pages.
        Inertia::share('terminal', fn () => $fresh->only('id', 'name', 'username', 'store_id', 'is_active'));
        Inertia::share('terminalStore', fn () => $fresh->store()->first(['id', 'name', 'slug', 'currency']));

        return $next($request);
    }
}
