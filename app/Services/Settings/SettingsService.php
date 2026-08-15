<?php

namespace App\Services\Settings;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    public const SETTINGS_CACHE_TTL = 300; // 5 minutes
    public const SETTINGS_CACHE_PREFIX = 'user_settings';

    /**
     * Get all settings for a user (global if storeId is null, store-specific if provided)
     *
     * @param int $userId
     * @param int|null $storeId
     * @return array
     */
    public function getUserSettings(int $userId, ?int $storeId = null): array
    {
        if (!$userId) {
            return [];
        }

        $cacheKey = self::SETTINGS_CACHE_PREFIX . '.' . $userId . '.' . ($storeId ?? 'global');

        return Cache::remember($cacheKey, self::SETTINGS_CACHE_TTL, function () use ($userId, $storeId) {
            return Setting::where('user_id', $userId)
                ->where('store_id', $storeId)
                ->pluck('value', 'key')
                ->toArray();
        });
    }

    /**
     * Forget cached settings for a user/store
     */
    public function forgetUserSettings(int $userId, ?int $storeId = null): void
    {
        $cacheKey = self::SETTINGS_CACHE_PREFIX . '.' . $userId . '.' . ($storeId ?? 'global');
        Cache::forget($cacheKey);
    }

    /**
     * Get a specific setting value
     */
    public function getSetting(int $userId, string $key, ?int $storeId = null, $default = null)
    {
        $setting = Setting::where('user_id', $userId)
            ->where('store_id', $storeId)
            ->where('key', $key)
            ->first();

        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value (creates or updates)
     */
    public function setSetting(string $key, $value, int $userId, ?int $storeId = null)
    {
        $result = Setting::updateOrCreate(
            ['user_id' => $userId, 'store_id' => $storeId, 'key' => $key],
            ['value' => $value]
        );

        $this->forgetUserSettings($userId, $storeId);

        return $result;
    }

    /**
     * Get default system settings
     */
    public function getDefaultSettings(): array
    {
        return [
            // System Settings
            'defaultLanguage' => 'ar',
            'dateFormat' => 'm/d/Y',
            'timeFormat' => 'h:i A',
            'calendarStartDay' => 'sunday',
            'defaultTimezone' => 'Asia/Hebron',
            'emailVerification' => false,
            'landingPageEnabled' => true,
            'registrationEnabled' => true,

            // Brand Settings
            'logoLight' => '/images/logos/logo-light.png',
            'favicon' => '/images/logos/favicon.png',
            'titleText' => 'Wusool',
            'footerText' => '© 2026 Wusool. All rights reserved.',
            'themeColor' => 'green',
            'customColor' => '#10b77f',
            'sidebarVariant' => 'inset',
            'sidebarStyle' => 'plain',
            'layoutDirection' => 'right',

            // Storage Settings
            'storage_type' => 'local',
            'storage_file_types' => 'jpg,png,webp,gif,pdf,doc,docx,txt,csv',
            'storage_max_upload_size' => '2048',
            'aws_access_key_id' => '',
            'aws_secret_access_key' => '',
            'aws_default_region' => 'us-east-1',
            'aws_bucket' => '',
            'aws_url' => '',
            'aws_endpoint' => '',
            'wasabi_access_key' => '',
            'wasabi_secret_key' => '',
            'wasabi_region' => 'us-east-1',
            'wasabi_bucket' => '',
            'wasabi_url' => '',
            'wasabi_root' => '',

            // Currency Settings
            'decimalFormat' => '2',
            'defaultCurrency' => 'ILS',
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'floatNumber' => true,
            'currencySymbolSpace' => false,
            'currencySymbolPosition' => 'after',

            // Cookie Settings
            'enableLogging' => true,
            'strictlyNecessaryCookies' => true,
            'cookieTitle' => 'موافقة ملفات تعريف الارتباط',
            'strictlyCookieTitle' => 'ملفات تعريف الارتباط الضرورية',
            'cookieDescription' => 'نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتوفير محتوى مخصص.',
            'strictlyCookieDescription' => 'هذه الملفات ضرورية لتشغيل الموقع بشكل صحيح.',
            'contactUsDescription' => 'إذا كان لديك أي أسئلة حول سياسة ملفات تعريف الارتباط، يرجى التواصل معنا.',
            'contactUsUrl' => 'https://wusool.ps/contact',
        ];
    }

    /**
     * Create default settings for a user if they don't exist
     */
    public function createDefaultSettings(int $userId): void
    {
        if (Setting::where('user_id', $userId)->exists()) {
            return;
        }

        $defaults = $this->getDefaultSettings();
        $settingsData = [];

        foreach ($defaults as $key => $value) {
            $settingsData[] = [
                'user_id' => $userId,
                'key' => $key,
                'value' => is_bool($value) ? ($value ? '1' : '0') : (string)$value,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        Setting::insert($settingsData);
    }

    /**
     * Copy system and brand settings from superadmin to company user
     */
    public function copySettingsFromSuperAdmin(int $companyUserId, ?int $companyUserCurrentStore = null): void
    {
        $superAdmin = User::where('type', 'superadmin')->first();
        if (!$superAdmin) {
            $this->createDefaultSettings($companyUserId);
            return;
        }

        $settingsToCopy = [
            'defaultLanguage', 'dateFormat', 'timeFormat', 'calendarStartDay',
            'defaultTimezone',
            'logoLight', 'favicon', 'titleText', 'footerText',
            'themeColor', 'customColor', 'sidebarVariant', 'sidebarStyle',
            'layoutDirection',
            'defaultCurrency', 'decimalFormat', 'decimalSeparator',
            'thousandsSeparator', 'floatNumber', 'currencySymbolSpace',
            'currencySymbolPosition'
        ];

        $superAdminSettings = Setting::where('user_id', $superAdmin->id)
            ->whereIn('key', $settingsToCopy)
            ->get();

        foreach ($superAdminSettings as $setting) {
            Setting::updateOrCreate(
                [
                    'user_id' => $companyUserId,
                    'store_id' => $companyUserCurrentStore,
                    'key' => $setting->key,
                ],
                ['value' => $setting->value]
            );

            $this->forgetUserSettings($companyUserId, $companyUserCurrentStore);
        }
    }
}