<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Models\StoreConfiguration;
use Inertia\Inertia;

class DomainResolver
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Skip during installation and admin routes
        if ($request->is('install/*') || $request->is('update/*') || !file_exists(storage_path('installed'))) {
            return $next($request);
        }
        
        $isStorePath = $request->is('store/*');
        $isStoresPath = $request->is('stores/*');
        
        
        
        // Skip for admin/dashboard routes and stores management. 
        // Auth paths (login, register, etc.) should NOT be skipped - they need domain resolution for custom domains.
        if ($request->is('dashboard*') || $request->is('admin*') || $isStoresPath) {
            return $next($request);
        }
        
        $host = $request->getHost();
        $cleanHost = str_replace(['http://', 'https://'], '', $host);
        $cleanHost = rtrim($cleanHost, '/');

        // CRITICAL: Prevent main app domain from being used as custom domain
        $mainAppDomain = str_replace(['http://', 'https://'], '', config('app.url'));
        $mainAppDomain = rtrim($mainAppDomain, '/');
        
        // Also check without www for main domain
        $mainAppDomainWithoutWww = str_starts_with($mainAppDomain, 'www.') ? substr($mainAppDomain, 4) : $mainAppDomain;
        $mainAppDomainWithWww = 'www.' . $mainAppDomainWithoutWww;
        
        // If current host matches main app domain, skip domain resolution
        if ($cleanHost === $mainAppDomain || 
            $cleanHost === $mainAppDomainWithoutWww || 
            $cleanHost === $mainAppDomainWithWww) {
            return $next($request);
        }
        $store = null;
        
        // Build candidate hosts so a bare "www." prefix does not break resolution
        $candidateHosts = [$host];
        if (str_starts_with($host, 'www.')) {
            $candidateHosts[] = substr($host, 4);
        } else {
            $candidateHosts[] = 'www.' . $host;
        }
        
        // Check verified custom domains from the store_domains table first
        foreach ($candidateHosts as $candidateHost) {
            $store = Store::findByDomain($candidateHost);
            if ($store) {
                break;
            }
        }
        
        // Check for custom domain (legacy stores.custom_domain column)
        if (!$store) {
            foreach ($candidateHosts as $candidateHost) {
                $store = Store::where('custom_domain', $candidateHost)
                            ->where('enable_custom_domain', true)
                            ->first();
                if ($store) {
                    break;
                }
            }
        }
        
        // Check store status via configuration — preserve unpublished store
        // when the request is an owner preview (session or signed token) so
        // DomainResolver does not nullify it before CheckStoreStatus can allow it.
        if ($store) {
            $config = StoreConfiguration::getConfiguration($store->id);
            if (!($config['store_status'] ?? true)) {
                if (!\App\Services\StorePreviewService::canPreview($request, $store)) {
                    $store = null;
                }
            }
        }
        
        // Check for custom subdomain if no custom domain found
        if (!$store && str_contains($host, '.')) {
            $subdomain = explode('.', $host)[0];
            $store = Store::where('custom_subdomain', $subdomain)
                        ->where('enable_custom_subdomain', true)
                        ->first();
            
            // Check store status via configuration — preserve owner preview
            if ($store) {
                $config = StoreConfiguration::getConfiguration($store->id);
                if (!($config['store_status'] ?? true)) {
                    if (!\App\Services\StorePreviewService::canPreview($request, $store)) {
                        $store = null;
                    }
                }
            }
        }

        // Fallback: default {slug}.{store_domain} subdomain pattern so the
        // canonical store URLs (e.g. https://my-store.wusool.ps) resolve to the
        // store even when no custom subdomain was explicitly enabled.
        if (!$store && str_contains($host, '.')) {
            $subdomain = explode('.', $host)[0];
            $storeDomain = str_replace(['http://', 'https://'], '', config('app.store_domain', 'localhost'));
            $storeDomain = rtrim($storeDomain, '/');

            if (str_ends_with($host, '.' . $storeDomain)) {
                $store = Store::where('slug', $subdomain)->first();

                if ($store) {
                    $config = StoreConfiguration::getConfiguration($store->id);
                    if (!($config['store_status'] ?? true)) {
                        if (!\App\Services\StorePreviewService::canPreview($request, $store)) {
                            $store = null;
                        }
                    }
                }
            }
        }
        
        if ($store) {
            // Set store context for the request
            $request->attributes->set('resolved_store', $store);
            $request->attributes->set('store_theme', $store->theme);
            
            // If it's a "store/{slug}" path but we are on a custom domain, redirect to clean path
            // Only redirect GET requests to avoid breaking form submissions
            if ($isStorePath && $request->segment(2) === $store->slug && $request->isMethod('get')) {
                $path = $request->path();
                $prefix = 'store/' . $store->slug;
                $cleanPath = trim(str_replace($prefix, '', $path), '/');
                $queryString = $request->getQueryString();
                return redirect()->to('/' . $cleanPath . ($queryString ? '?' . $queryString : ''));
            }
            
            // For API requests, add store_id to request
            if ($request->is('api/*')) {
                $request->merge(['store_id' => $store->id]);
                return $next($request);
            }
            
            // Handle direct domain/subdomain access (clean URLs)
            if (!$isStorePath) {
                // Check if store is active and not in maintenance — allow owner preview
                $config = StoreConfiguration::getConfiguration($store->id);

                if (!($config['store_status'] ?? true)) {
                    if (\App\Services\StorePreviewService::canPreview($request, $store)) {
                        $request->attributes->set('store_preview', true);
                        $request->attributes->set('preview_store_id', $store->id);
                    } else {
                        $reason = ($config['plan_disabled'] ?? false) ? 'تم تجاوز حد الاشتراك' : 'تم تعطيل المتجر بواسطة المالك';
                        return Inertia::render('store/StoreDisabled', [
                            'store' => $store->only(['id', 'name', 'slug']),
                            'reason' => $reason
                        ])->toResponse($request)->setStatusCode(503);
                    }
                }
                
                if ($config['maintenance_mode'] ?? false) {
                    return Inertia::render('store/StoreMaintenance', [
                        'store' => $store->only(['id', 'name', 'slug']),
                        'message' => $config['maintenance_message'] ?? null,
                    ])->toResponse($request)->setStatusCode(503);
                }
                
                // Route the request to appropriate store controller method
                return $this->handleStoreRequest($request, $store);
            }
        }
        
        return $next($request);
    }
    
    /**
     * Handle store request based on path
     */
    private function handleStoreRequest(Request $request, Store $store)
    {
        $path = trim($request->getPathInfo(), '/');
        $segments = explode('/', $path);
        

        if (empty($path)) {
            // Home page
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        }

        if ($segments[0] === 'products') {
            // Dedicated all-products listing page (server-side pagination + SEO).
            return app(\App\Http\Controllers\ThemeController::class)->products($store->slug, $request);
        } elseif ($segments[0] === 'product' && isset($segments[1])) {
            // JSON request from the storefront detail modal: serve the full
            // product on demand so heavy fields stay out of the page payload.
            if ($request->wantsJson()) {
                return app(\App\Http\Controllers\ThemeController::class)->productDetail($store->slug, $segments[1], $request);
            }
            // Product detail page (single-page storefront: render the homepage).
            // Resolve the product so the shared SEO layer can emit real
            // product meta + JSON-LD for crawlers/deep-links on custom domains.
            $seoProduct = app(\App\Services\StorefrontSeoService::class)
                ->setStore($store)
                ->resolveProduct((string) $segments[1]);
            $request->merge(['action' => 'product', 'product_id' => $segments[1]]);
            if ($seoProduct) {
                $request->attributes->set('seo_product', $seoProduct);
                $request->attributes->set('seo_context', 'product');
            }
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'search') {
            // Dedicated storefront search results page — store-scoped, paginated, server-authoritative.
            return app(\App\Http\Controllers\ThemeController::class)->search($store->slug, $request);
        } elseif ($segments[0] === 'category' && isset($segments[1])) {
            // Dedicated category listing page (server-side pagination + SEO).
            // Accepts both the category slug and legacy numeric ids.
            return app(\App\Http\Controllers\ThemeController::class)->category($store->slug, $segments[1], $request);
        } elseif ($segments[0] === 'cart') {
            // Cart page
            $request->merge(['action' => 'cart']);
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'wishlist') {
            // Wishlist page
            $request->merge(['action' => 'wishlist']);
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'checkout') {
            // Checkout page
            $request->merge(['action' => 'checkout']);
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'manifest.json') {
            // PWA Manifest
            return app(\App\Http\Controllers\PWAController::class)->manifest($store->slug);
        } elseif ($segments[0] === 'service-worker') {
            // PWA Service Worker
            return app(\App\Http\Controllers\PWAController::class)->serviceWorker($store->slug);
        } elseif ($segments[0] === 'pwa-icon' && isset($segments[1])) {
            // PWA Icon (custom-domain stores: avoid hitting the main-app catch-all)
            return app(\App\Http\Controllers\PWAController::class)->icon($store->slug, $segments[1]);
        } elseif ($segments[0] === 'login') {
            // Login page
            if ($request->isMethod('get')) {
                $request->merge(['action' => 'login']);
                return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
            }
            return app(\App\Http\Controllers\Store\AuthController::class)->login($request, $store->slug);
        } elseif ($segments[0] === 'register') {
            // Register page
            if ($request->isMethod('get')) {
                $request->merge(['action' => 'register']);
                return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
            }
            return app(\App\Http\Controllers\Store\AuthController::class)->register($request, $store->slug);
        } elseif ($segments[0] === 'logout') {
            // Logout
            return app(\App\Http\Controllers\Store\AuthController::class)->logout($request, $store->slug);
        } elseif ($segments[0] === 'forgot-password') {
            // Forgot password
            if ($request->isMethod('get')) {
                $request->merge(['action' => 'forgot-password']);
                return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
            }
            return app(\App\Http\Controllers\Store\AuthController::class)->forgotPassword($request, $store->slug);
        } elseif ($segments[0] === 'reset-password') {
            if (isset($segments[1])) {
                // Reset form (GET)
                return app(\App\Http\Controllers\Store\AuthController::class)->showResetForm($store->slug, $segments[1]);
            } else {
                // Reset password (POST)
                return app(\App\Http\Controllers\Store\AuthController::class)->resetPassword($request, $store->slug);
            }
        } elseif ($segments[0] === 'profile') {
            if (isset($segments[1]) && $segments[1] === 'update') {
                return app(\App\Http\Controllers\Store\ProfileController::class)->updateProfile($request, $store->slug);
            } elseif (isset($segments[1]) && $segments[1] === 'password') {
                return app(\App\Http\Controllers\Store\ProfileController::class)->updatePassword($request, $store->slug);
            }
            $request->merge(['action' => 'profile']);
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'order') {
            if (isset($segments[1]) && $segments[1] === 'place') {
                // Place order
                return app(\App\Http\Controllers\Store\OrderController::class)->placeOrder($request, $store->slug);
            } elseif (isset($segments[1])) {
                if (isset($segments[2]) && $segments[2] === 'pdf') {
                    // Order PDF
                    return app(\App\Http\Controllers\ThemeController::class)->downloadOrderPdf($store->slug, $segments[1]);
                }
                // Order detail page
                $request->merge(['action' => 'order', 'order_number' => $segments[1]]);
                return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
            }
        } elseif ($segments[0] === 'razorpay' && isset($segments[1]) && $segments[1] === 'verify-payment') {
            // Razorpay payment verification
            return app(\App\Http\Controllers\Store\RazorpayController::class)->verifyPayment($request, $store->slug);
        } elseif ($segments[0] === 'my-orders') {
            // My orders page
            $request->merge(['action' => 'orders']);
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'my-profile') {
            // My profile page
            $request->merge(['action' => 'profile']);
            return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
        } elseif ($segments[0] === 'order-confirmation') {
            // Order confirmation page
            $orderNumber = $segments[1] ?? null;
            return app(\App\Http\Controllers\ThemeController::class)->orderConfirmation($store->slug, $orderNumber);
        } elseif ($segments[0] === 'translations' && isset($segments[1])) {
            // Support theme translations
            return app(\App\Http\Controllers\TranslationController::class)->getTranslations($segments[1]);
        } elseif ($segments[0] === 'stripe' && isset($segments[1]) && $segments[1] === 'success' && isset($segments[2])) {
            return app(\App\Http\Controllers\Store\StripeController::class)->success($request, $store->slug, $segments[2]);
        } elseif ($segments[0] === 'paypal' && isset($segments[1]) && $segments[1] === 'success' && isset($segments[2])) {
            return app(\App\Http\Controllers\Store\PayPalController::class)->success($request, $store->slug, $segments[2]);
        } elseif (isset($segments[1]) && in_array($segments[0], ['tap', 'payfast', 'paytr', 'iyzipay', 'khalti', 'easebuzz', 'ozow', 'authorizenet', 'fedapay', 'payhere', 'cinetpay', 'nepalste', 'paiement', 'aamarpay'], true) && $segments[1] === 'success') {
            // Universal adapter returns (GET or gateway POST-back to return_url)
            $gw = $segments[0];
            $gatewayController = app(\App\Http\Controllers\Store\GatewayReturnController::class);
            if ($gw === 'nepalste' && isset($segments[3])) {
                return $gatewayController->nepalsteSuccess($request, $store->slug, $segments[2], $segments[3]);
            }
            return $gatewayController->{$gw . 'Success'}($request, $store->slug, $segments[2]);
        } elseif (isset($segments[1]) && in_array($segments[0], ['tap', 'payfast', 'paytr', 'iyzipay', 'khalti', 'easebuzz', 'ozow', 'fedapay', 'payhere', 'cinetpay', 'nepalste', 'paiement', 'aamarpay'], true) && $segments[1] === 'callback') {
            // Universal adapter server-to-server callbacks (signature verified in controller)
            $gw = $segments[0];
            $orderNumber = $segments[2] ?? null;
            return app(\App\Http\Controllers\Store\GatewayReturnController::class)->{$gw . 'Callback'}($request, $store->slug, $orderNumber);
        } else {
            // Only serve homepage for root path, return 404 for unknown paths
            if ($request->path() === '/' || $request->path() === $store->slug) {
                return app(\App\Http\Controllers\ThemeController::class)->home($store->slug, $request);
            }
            abort(404);
        }
    }
}