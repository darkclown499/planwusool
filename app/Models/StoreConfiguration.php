<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreConfiguration extends Model
{
    protected $fillable = [
        'store_id',
        'key',
        'value'
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    protected static array $requestCache = [];

    /**
     * Clear the request-level memoization cache.
     * Useful in tests where RefreshDatabase resets the DB but static properties persist.
     */
    public static function flushRequestCache(): void
    {
        self::$requestCache = [];
    }

    /**
     * Safely cast a configuration value to boolean.
     *
     * PHP's native (bool) cast treats ANY non-empty string as true,
     * including the string 'false'. FeatureService stores boolean toggles
     * as the strings 'true'/'false', so we must handle this explicitly.
     *
     * @param mixed $value     Raw config value (string 'true'/'false', bool, null)
     * @param bool  $default   Fallback when value is null/empty
     * @return bool
     */
    public static function toBool($value, bool $default = false): bool
    {
        if (is_bool($value)) return $value;
        if (is_null($value) || $value === '') return $default;
        if (is_string($value)) {
            $v = strtolower(trim($value));
            return in_array($v, ['1', 'true', 'yes', 'on'], true);
        }
        return (bool) $value;
    }

    /**
     * Get configuration for a store (cached for 5 minutes + request-level memoization).
     */
    public static function getConfiguration($storeId)
    {
        if (isset(self::$requestCache[$storeId])) {
            return self::$requestCache[$storeId];
        }
        
        $config = \Illuminate\Support\Facades\Cache::remember(
            'store_configuration.' . $storeId,
            300,
            function () use ($storeId) {
                $configs = self::where('store_id', $storeId)->pluck('value', 'key')->toArray();

                // Default values (original + plan management) — platform default is ILS / ₪
                $defaults = [
                    'default_currency' => 'ILS',
                    'timezone' => 'utc',
                    'language' => 'ar',
                    'meta_title' => '',
                    'meta_description' => '',
                    'meta_keywords' => '',
                    'og_image' => '',
                    'google_analytics_id' => '',
                    'meta_pixel_id' => '',
                    'tiktok_pixel_id' => '',
                    'snapchat_pixel_id' => '',
                    'gtm_id' => '',
                    'store_status' => 'true',
                    'maintenance_mode' => 'false',
                    'maintenance_message' => '',
                    'logo' => '',
                    'favicon' => '',
                    'welcome_message' => '',
                    'store_description' => '',
                    'copyright_text' => '',
                    'facebook_url' => '',
                    'instagram_url' => '',
                    'twitter_url' => '',
                    'youtube_url' => '',
                    'whatsapp_url' => '',
                    'social_links' => '[]',
                    'address' => '',
                    'city' => '',
                    'state' => '',
                    'country' => '',
                    'postal_code' => '',
                    'email' => '',
                    'plan_disabled' => 'false',
                    'custom_css' => '',
                    'custom_javascript' => '',
                    'custom_head_scripts' => '',
                    'custom_body_scripts' => '',
                    // WhatsApp Widget Settings (separate from payment WhatsApp)
                    'whatsapp_widget_enabled' => 'false',
                    'whatsapp_widget_phone' => '',
                    'whatsapp_widget_message' => 'Hello! I need help with...',
                    'whatsapp_widget_position' => 'right',
                    'whatsapp_widget_show_on_mobile' => 'true',
                    'whatsapp_widget_show_on_desktop' => 'true',
                    'low_stock_threshold' => '10',
                    // Storefront behavior toggles — canonical keys
                    'enable_customer_login' => 'true',
                    'enable_customer_registration' => 'true',
                    'customer_registration_enabled' => 'true',
                    'require_login_checkout' => 'false',
                    'show_whatsapp_order_button' => 'true',
                    'show_search' => 'true',
                    'show_cart' => 'true',
                    'show_auth_button' => 'true',
                    'customer_accounts_enabled' => 'true',
                    'guest_checkout' => 'true',
                    // Canonical Free Shipping Business Settings (default OFF - never assume intent)
                    'free_shipping_enabled' => 'false',
                    'free_shipping_threshold' => '',
                    'customer_verification_method' => 'email',
                ];

                $result = array_merge($defaults, $configs);

                // Canonical alias sync: customer_registration_enabled is the single source of truth
                // Legacy key enable_customer_registration is kept for BC but both must stay in sync.
                // If both exist in DB, canonical wins.
                if (array_key_exists('customer_registration_enabled', $configs) || array_key_exists('enable_customer_registration', $configs)) {
                    $canonical = $configs['customer_registration_enabled'] ?? $configs['enable_customer_registration'] ?? 'true';
                    $normalized = ($canonical === 'true' || $canonical === true || $canonical === 1 || $canonical === '1') ? 'true' : 'false';
                    $result['customer_registration_enabled'] = $normalized;
                    $result['enable_customer_registration'] = $normalized;
                }

                // Normalize verification method enum: none | email
                $rawMethod = $result['customer_verification_method'] ?? 'email';
                $rawMethod = is_string($rawMethod) ? strtolower(trim($rawMethod)) : 'email';
                $result['customer_verification_method'] = in_array($rawMethod, ['none','email'], true) ? $rawMethod : 'email';

                // Convert string values to boolean for specific keys
                $booleanKeys = ['store_status', 'maintenance_mode', 'plan_disabled', 'whatsapp_widget_enabled', 'whatsapp_widget_show_on_mobile', 'whatsapp_widget_show_on_desktop', 'enable_customer_login', 'enable_customer_registration', 'customer_registration_enabled', 'require_login_checkout', 'show_whatsapp_order_button', 'show_search', 'show_cart', 'show_auth_button', 'customer_accounts_enabled', 'guest_checkout', 'free_shipping_enabled'];
                foreach ($booleanKeys as $key) {
                    if (isset($result[$key])) {
                        $result[$key] = $result[$key] === 'true' || $result[$key] === true;
                    }
                }

                // Decode social_links JSON
                if (isset($result['social_links'])) {
                    $decoded = json_decode($result['social_links'], true);
                    $result['social_links'] = is_array($decoded) ? $decoded : [];
                }

                return $result;
            }
        );
        
        self::$requestCache[$storeId] = $config;
        
        return $config;
    }

    /**
     * Forget the cached configuration for a store.
     */
    public static function forgetConfiguration($storeId)
    {
        \Illuminate\Support\Facades\Cache::forget('store_configuration.' . $storeId);
        unset(self::$requestCache[$storeId]);
    }

    /**
     * Set configuration for a store
     */
    public static function setConfiguration($storeId, $key, $value)
    {
        $result = self::updateOrCreate(
            ['store_id' => $storeId, 'key' => $key],
            ['value' => $value]
        );
        self::forgetConfiguration($storeId);
        return $result;
    }
    
    /**
     * Update multiple configurations for a store (original method)
     */
    public static function updateConfiguration($storeId, $settings)
    {
        foreach ($settings as $key => $value) {
            if (is_array($value) || is_object($value)) {
                $storedValue = json_encode($value);
            } elseif (is_bool($value)) {
                $storedValue = $value ? 'true' : 'false';
            } else {
                $storedValue = (string) $value;
            }

            self::updateOrCreate(
                ['store_id' => $storeId, 'key' => $key],
                ['value' => $storedValue]
            );
        }

        self::forgetConfiguration($storeId);
    }

    /**
     * Delete configuration rows for a given set of keys so defaults apply.
     */
    public static function resetKeys($storeId, array $keys)
    {
        if (empty($keys)) {
            return;
        }

        self::where('store_id', $storeId)
            ->whereIn('key', $keys)
            ->delete();

        self::forgetConfiguration($storeId);
    }
    
    /**
     * Disable store due to plan limitations
     */
    public static function disableStoreDueToPlan($storeId)
    {
        self::setConfiguration($storeId, 'store_status', 'false');
        self::setConfiguration($storeId, 'plan_disabled', 'true');
    }
    
    /**
     * Enable store after plan upgrade
     */
    public static function enableStoreAfterPlanUpgrade($storeId)
    {
        self::setConfiguration($storeId, 'store_status', 'true');
        self::setConfiguration($storeId, 'plan_disabled', 'false');
    }
}