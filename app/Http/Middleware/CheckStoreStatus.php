<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Models\StoreConfiguration;
use Inertia\Inertia;

class CheckStoreStatus
{
    public function handle(Request $request, Closure $next)
    {
        // Get store from route parameter
        $storeSlug = $request->route('storeSlug');
        
        if ($storeSlug) {
            $store = Store::where('slug', $storeSlug)->first();
            
            if (!$store) {
                // Store not found - show 404
                return Inertia::render('store/StoreNotFound', [
                    'requestedSlug' => htmlspecialchars($storeSlug, ENT_QUOTES, 'UTF-8')
                ])->toResponse($request)->setStatusCode(404);
            }
            
            // If store has custom domain or subdomain enabled, block regular route access
            // UNLESS the request is coming from that custom domain/subdomain
            if ($store->enable_custom_domain || $store->enable_custom_subdomain) {
                $host = $request->getHost();
                $isCustomDomainRequest = false;
                
                if ($store->enable_custom_domain && $store->custom_domain === $host) {
                    $isCustomDomainRequest = true;
                }
                
                if ($store->enable_custom_subdomain) {
                    $appUrl = config('app.url');
                    $appHost = parse_url($appUrl, PHP_URL_HOST) ?? $appUrl;
                    
                    $subdomain = $store->custom_subdomain . '.' . $appHost;
                    if ($subdomain === $host) {
                        $isCustomDomainRequest = true;
                    }
                }
                
                if (!$isCustomDomainRequest) {
                    return Inertia::render('store/StoreNotFound', [
                        'requestedSlug' => htmlspecialchars($storeSlug, ENT_QUOTES, 'UTF-8')
                    ])->toResponse($request)->setStatusCode(404);
                }
            }
            
            $config = StoreConfiguration::getConfiguration($store->id);
            
            // Check if store is disabled
            if (!($config['store_status'] ?? true)) {
                $reason = ($config['plan_disabled'] ?? false) ? 'Plan limit exceeded' : 'Store disabled by owner';
                return Inertia::render('store/StoreDisabled', [
                    'store' => $store,
                    'reason' => $reason
                ])->toResponse($request)->setStatusCode(503);
            }
            
            // Check if store is in maintenance mode
            if ($config['maintenance_mode'] ?? false) {
                return Inertia::render('store/StoreMaintenance', [
                    'store' => $store
                ])->toResponse($request)->setStatusCode(503);
            }
        }
        
        return $next($request);
    }
}