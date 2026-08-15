<?php

namespace App\Services\PWA;

use App\Models\Store;
use App\Models\StoreConfiguration;

class PWAService
{
    /**
     * Get PWA icon URL with proper fallback chain
     * Priority: Store favicon > Company store favicon > Store logo > Default
     */
    public function getPWAIconUrl(Store $store): ?string
    {
        $storeConfig = \App\Models\StoreConfiguration::getConfiguration($store->id);

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
    public function generatePWAIcons(Store $store): array
    {
        // PWA standard sizes - we use the dynamic route to ensure perfect compatibility
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
     * Get PWA manifest data
     */
    public function getManifestData(Store $store): array
    {
        $plan = $store->user?->getCurrentPlan();

        if (!$store->enable_pwa || !$plan || $plan->pwa_business !== 'on') {
            return null;
        }

        $cacheVersion = $store->updated_at ? $store->updated_at->timestamp : 0;

        return [
            'enabled' => true,
            'name' => $store->pwa_name ?: $store->name,
            'short_name' => $store->pwa_short_name ?: mb_substr($store->name, 0, 12),
            'description' => $store->pwa_description ?: $store->description,
            'theme_color' => $store->pwa_theme_color ?: '#3B82F6',
            'background_color' => $store->pwa_background_color ?: '#ffffff',
            'manifest_url' => route('store.pwa.manifest', $store->slug) . '?v=' . $cacheVersion,
            'sw_url' => route('store.pwa.sw', $store->slug) . '?v=' . $cacheVersion,
            'icons' => $this->generatePWAIcons($store),
        ];
    }
}