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

    /**
     * Get configuration for a store
     */
    public static function getConfiguration($storeId)
    {
        $configs = self::where('store_id', $storeId)->pluck('value', 'key')->toArray();
        
        // Default values (original + plan management)
        $defaults = [
            'default_currency' => 'ils',
            'timezone' => 'utc',
            'language' => 'ar',
            'meta_title' => '',
            'meta_description' => '',
            'google_analytics_id' => '',
            'meta_pixel_id' => '',
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
            // WhatsApp Widget Settings (separate from payment WhatsApp)
            'whatsapp_widget_enabled' => 'false',
            'whatsapp_widget_phone' => '',
            'whatsapp_widget_message' => 'Hello! I need help with...',
            'whatsapp_widget_position' => 'right',
            'whatsapp_widget_show_on_mobile' => 'true',
            'whatsapp_widget_show_on_desktop' => 'true',
        ];
        
        $result = array_merge($defaults, $configs);
        
        // Convert string values to boolean for specific keys
        $booleanKeys = ['store_status', 'maintenance_mode', 'plan_disabled', 'whatsapp_widget_enabled', 'whatsapp_widget_show_on_mobile', 'whatsapp_widget_show_on_desktop'];
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

    /**
     * Set configuration for a store
     */
    public static function setConfiguration($storeId, $key, $value)
    {
        return self::updateOrCreate(
            ['store_id' => $storeId, 'key' => $key],
            ['value' => $value]
        );
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