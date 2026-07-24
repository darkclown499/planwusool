<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ShareStoresData
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Share stores data for company users and sub-users with manage-stores permission
            if ($user->type === 'company') {
                $stores = Store::where('user_id', $user->id)->get();
                Inertia::share('stores', $stores);
            } elseif ($user->created_by && $user->hasPermissionTo('manage-stores')) {
                // Sub-users with manage-stores permission get their company's stores
                $stores = Store::where('user_id', $user->created_by)->get();
                Inertia::share('stores', $stores);
            } else {
                Inertia::share('stores', collect());
            }
        }

        return $next($request);
    }
}