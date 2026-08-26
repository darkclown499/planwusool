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
                    $appHost = getBaseDomain();
                    
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
            
            // Check if store is disabled — allow authenticated owner preview via
            // session ownership or a signed preview_token scoped to this store.
            // Anonymous and cross-merchant requests remain blocked (503).
            if (!($config['store_status'] ?? true)) {
                if (\App\Services\StorePreviewService::canPreview($request, $store)) {
                    // Owner preview: mark request so ThemeController can expose
                    // isPreview flag and block real order creation.
                    $request->attributes->set('store_preview', true);
                    $request->attributes->set('preview_store_id', $store->id);
                } else {
                    $reason = ($config['plan_disabled'] ?? false) ? 'تم تجاوز حد الاشتراك' : 'تم تعطيل المتجر بواسطة المالك';
                    return Inertia::render('store/StoreDisabled', [
                        'store' => $store,
                        'reason' => $reason
                    ])->toResponse($request)->setStatusCode(503);
                }
            }
            
            // Check if store is in maintenance mode
            if ($config['maintenance_mode'] ?? false) {
                return Inertia::render('store/StoreMaintenance', [
                    'store' => $store,
                    'message' => $config['maintenance_message'] ?? null,
                ])->toResponse($request)->setStatusCode(503);
            }
        }
        
        return $next($request);
    }
}