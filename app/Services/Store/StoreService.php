<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\Setting;

class StoreService
{
    /**
     * Get store configuration with defaults
     */
    public function getConfiguration(int $storeId): array
    {
        return StoreConfiguration::getConfiguration($storeId);
    }

    /**
     * Get merged store content (defaults merged with store-specific content)
     */
    public function getMergedContent(Store $store): array
    {
        return $store->getMergedStoreContent();
    }

    /**
     * Get store URL based on domain configuration
     */
    public function getStoreUrl(Store $store): string
    {
        return $store->getStoreUrl();
    }

    /**
     * Check if store can use custom domain
     */
    public function canUseCustomDomain(Store $store): bool
    {
        $plan = $store->user->getCurrentPlan();
        return $plan && $plan->enable_custdomain === 'on';
    }

    /**
     * Check if store can use custom subdomain
     */
    public function canUseCustomSubdomain(Store $store): bool
    {
        $plan = $store->user->getCurrentPlan();
        return $plan && $plan->enable_custsubdomain === 'on';
    }

    /**
     * Check if store is active
     */
    public function isActive(Store $store): bool
    {
        $config = StoreConfiguration::getConfiguration($store->id);
        return $config['store_status'] ?? true;
    }

    /**
     * Get PWA icon URL with proper fallback chain
     */
    public function getPWAIconUrl($store): ?string
    {
        $storeConfig = StoreConfiguration::getConfiguration($store->id);

        // Priority 1: Store favicon from store_configuration
        if (!empty($storeConfig['favicon'])) {
            return asset($storeConfig['favicon']);
        }

        // Priority 2: Company favicon for this store (settings table with store_id)
        if ($store->user) {
            $userSettings = \App\Models\Setting::getUserSettings($store->user->id, $store->id);
            if (!empty($userSettings['favicon'])) {
                return asset($userSettings['favicon']);
            }
        }

        // Priority 3: Store logo
        if (!empty($storeConfig['logo'])) {
            return asset($storeConfig['logo']);
        }

        // Priority 4: Default logo (check if exists, otherwise use fallback)
        $defaultPath = public_path('images/logos/favicon.png');
        if (file_exists($defaultPath)) {
            return asset('images/logos/favicon.png');
        }

        return null;
    }

    /**
     * Generate PWA icons array with optimized fallback chain
     */
    public function generatePWAIcons($store): array
    {
        $sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];
        $icons = [];

        foreach ($sizes as $size) {
            $icons[] = [
                'src' => route('store.pwa.icon', ['storeSlug' => $store->slug, 'size' => $size]),
                'sizes' => $size . 'x' . $size,
                'type' => 'image/png',
                'purpose' => 'any maskable'
            ];
        }

        return $icons;
    }

    /**
     * Check if store can use custom domain
     */
    public function canUseCustomDomain($store): bool
    {
        $plan = $store->user->getCurrentPlan();
        return $plan && $plan->enable_custdomain === 'on';
    }

    /**
     * Check if store can use custom subdomain
     */
    public function canUseCustomSubdomain($store): bool
    {
        $plan = $store->user->getCurrentPlan();
        return $plan && $plan->enable_custsubdomain === 'on';
    }
}