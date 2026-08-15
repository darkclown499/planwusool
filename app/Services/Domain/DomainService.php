<?php

namespace App\Services\Domain;

use App\Models\Store;
use Illuminate\Http\Request;

class DomainService
{
    /**
     * Get store URL based on domain configuration
     */
    public function getStoreUrl($store): string
    {
        if (!$store) {
            return url('/');
        }

        return $store->getStoreUrl();
    }

    /**
     * Check if current request is on custom domain
     */
    public function isCustomDomain($host = null): bool
    {
        if (!$host) {
            $host = request()->getHost();
        }

        // Check custom domain
        $customDomain = Store::where('custom_domain', $host)
            ->where('enable_custom_domain', true)
            ->whereHas('configurations', function($q) {
                $q->where('key', 'store_status')->where('value', 'true');
            })->exists();

        // Also check stores without configuration (default active)
        if (!$customDomain) {
            $customDomain = Store::where('custom_domain', $host)
                ->where('enable_custom_domain', true)
                ->whereDoesntHave('configurations', function($q) {
                    $q->where('key', 'store_status');
                })->exists();
        }

        if ($customDomain) {
            return true;
        }

        // Check custom subdomain
        if (str_contains($host, '.')) {
            $subdomain = explode('.', $host)[0];
            $subdomainExists = Store::where('custom_subdomain', $subdomain)
                ->where('enable_custom_subdomain', true)
                ->whereHas('configurations', function($q) {
                    $q->where('key', 'store_status')->where('value', 'true');
                })->exists();

            // Also check stores without configuration (default active)
            if (!$subdomainExists) {
                $subdomainExists = Store::where('custom_subdomain', $subdomain)
                    ->where('enable_custom_subdomain', true)
                    ->whereDoesntHave('configurations', function($q) {
                        $q->where('key', 'store_status');
                    })->exists();
            }

            return $subdomainExists;
        }

        return false;
    }

    /**
     * Get current store from request
     */
    public function getCurrentStore()
    {
        return request()->attributes->get('resolved_store');
    }

    /**
     * Check if current request is from custom domain
     */
    public function isCustomDomainRequest(): bool
    {
        $store = $this->getCurrentStore();
        return $store && ($store->enable_custom_domain || $store->enable_custom_subdomain);
    }

    /**
     * Generate store URL with custom domain support
     */
    public function storeUrl($store, $path = '', $parameters = []): string
    {
        if (is_string($store)) {
            $store = \App\Models\Store::where('slug', $store)->first();
        }

        if (!$store) {
            return url($path);
        }

        return $store->route($path, $parameters);
    }

    /**
     * Get the full subdomain URL for a store
     */
    public function getSubdomainUrl($slug): string
    {
        $baseDomain = parse_url(config('app.url'), PHP_URL_HOST) ?? 'wusool.ps';
        return "https://{$slug}.{$baseDomain}";
    }

    /**
     * Get the base domain from APP_URL
     */
    public function getBaseDomain(): string
    {
        return parse_url(config('app.url'), PHP_URL_HOST) ?? 'wusool.ps';
    }

    /**
     * Get the app URL with the correct protocol (HTTP/HTTPS).
     * Respects X-Forwarded-Proto header from proxies (LocalTunnel, ngrok, etc.)
     */
    public function getSchemeAwareUrl(): string
    {
        $request = request();
        if ($request) {
            return $request->getSchemeAndHttpHost();
        }
        return config('app.url', 'http://localhost');
    }

    /**
     * Get the full URL for a storage/public file, using the correct protocol.
     * Replaces all config('app.url') usages for storage URLs.
     */
    public function getSchemeAwareStorageUrl($path = ''): string
    {
        $baseUrl = rtrim($this->getSchemeAwareUrl(), '/');
        if ($path) {
            return $baseUrl . '/' . ltrim($path, '/');
        }
        return $baseUrl;
    }
}