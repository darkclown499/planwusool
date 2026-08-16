<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreOwner
{
    /**
     * Ensure the authenticated user is the owner of the store referenced by
     * the route (or their current store) so a merchant can never read or
     * mutate another tenant's data by guessing an id/slug (IDOR). Superadmins
     * bypass the check.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        if ($user->type === 'superadmin') {
            return $next($request);
        }

        $store = $this->resolveStore($request);

        if (!$store) {
            abort(403);
        }

        $ownsStore = (int) $store->user_id === (int) $user->id
            || (int) $store->id === (int) ($user->current_store ?? 0);

        if (!$ownsStore) {
            abort(403);
        }

        return $next($request);
    }

    /**
     * Resolve the store from an implicit route model binding ({store}),
     * explicit store_id/current_store parameters, or the user's current store.
     */
    protected function resolveStore(Request $request): ?Store
    {
        $route = $request->route();

        if (!$route) {
            return null;
        }

        foreach (['store', 'store_id'] as $param) {
            $value = $route->parameter($param) ?? $request->input($param);

            if ($value instanceof Store) {
                return $value;
            }

            if ($value !== null) {
                $found = Store::find($value);

                if ($found) {
                    return $found;
                }
            }
        }

        $user = $request->user();

        if ($user && $user->current_store) {
            return Store::find($user->current_store);
        }

        return null;
    }
}