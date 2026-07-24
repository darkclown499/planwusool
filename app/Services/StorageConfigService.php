<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class StorageConfigService
{
    private static $config = null;

    /**
     * Get the active storage disk name
     */
    public static function getActiveDisk(): string
    {
        $userId = Auth::id();
        if (!$userId) {
            return 'public'; // Default for unauthenticated users
        }
        
        // Determine the correct user ID for settings lookup
        $user = Auth::user();
        $settingsUserId = $userId;
        if ($user && !in_array($user->type, ['superadmin', 'company']) && $user->created_by) {
            $settingsUserId = $user->created_by;
        }
        
        $cacheKey = 'active_storage_config_' . $settingsUserId;
        $config = Cache::remember($cacheKey, 300, function() use ($settingsUserId) {
            return self::loadStorageConfigFromDB($settingsUserId);
        });
        
        return $config['disk'] ?? 'public';
    }

    /**
     * Get file validation rules based on settings
     */
    public static function getFileValidationRules(): array
    {
        $config = self::getStorageConfig();
        
        $allowedTypes = $config['allowed_file_types'] ?? '';
        $maxSize = ($config['max_file_size_mb'] ?? 2) * 1024; // Convert MB to KB
        
        return [
            'mimes:' . $allowedTypes,
            'max:' . $maxSize
        ];
    }

    /**
     * Get complete storage configuration
     */
    public static function getStorageConfig(): array
    {
        $userId = Auth::id();
        if (!$userId) {
            return self::getDefaultConfig(); // Default for unauthenticated users
        }
        
        // Determine the correct user ID for settings lookup
        $user = Auth::user();
        $settingsUserId = $userId;
        if ($user && !in_array($user->type, ['superadmin', 'company']) && $user->created_by) {
            $settingsUserId = $user->created_by;
        }
        
        $cacheKey = 'active_storage_config_' . $settingsUserId;
        return Cache::remember($cacheKey, 300, function() use ($settingsUserId) {
            return self::loadStorageConfigFromDB($settingsUserId);
        });
    }

    /**
     * Clear storage configuration cache
     */
    public static function clearCache(): void
    {
        $userId = Auth::id();
        if ($userId) {
            Cache::forget('active_storage_config_' . $userId);
        }
    }

    /**
     * Load storage configuration from database
     */
    private static function loadStorageConfigFromDB($userId = null): array
    {
        try {
            if (!$userId) {
                return self::getDefaultConfig();
            }
            
            // Determine the correct user ID for settings lookup
            $user = \App\Models\User::find($userId);
            if (!$user) {
                return self::getDefaultConfig();
            }
            
            // For staff users, use their company's settings
            $settingsUserId = $userId;
            if (!in_array($user->type, ['superadmin', 'company']) && $user->created_by) {
                $settingsUserId = $user->created_by;
            }
            
            $settings = DB::table('settings')
                ->where('user_id', $settingsUserId) 
                ->whereIn('key', [
                    'storage_type',
                    'storage_file_types', 
                    'storage_max_upload_size',
                    'aws_access_key_id',
                    'aws_secret_access_key',
                    'aws_default_region',
                    'aws_bucket',
                    'aws_url',
                    'aws_endpoint',
                    'wasabi_access_key',
                    'wasabi_secret_key',
                    'wasabi_region',
                    'wasabi_bucket',
                    'wasabi_url',
                    'wasabi_root'
                ])
                ->pluck('value', 'key')
                ->toArray();
            // If no storage settings found, return default
            if (empty($settings)) {
                return self::getDefaultConfig();
            }
            
            // Map storage_type to correct disk name
            $storageType = $settings['storage_type'] ?? 'local';
            $diskName = match($storageType) {
                'local' => 'public',
                'aws_s3' => 's3',
                'wasabi' => 'wasabi',
                default => 'public'
            };
            
            return [
                'disk' => $diskName,
                'allowed_file_types' => $settings['storage_file_types'] ?? 'jpg,jpeg,png,webp,gif,pdf,doc,docx,csv,txt,zip,mp4,mp3',
                'max_file_size_mb' => (int)($settings['storage_max_upload_size'] ?? 2),
                'max_file_size_kb' => (int)($settings['storage_max_upload_size'] ?? 2) * 1024,
                's3' => [
                    'key' => $settings['aws_access_key_id'] ?? '',
                    'secret' => $settings['aws_secret_access_key'] ?? '',
                    'bucket' => $settings['aws_bucket'] ?? '',
                    'region' => $settings['aws_default_region'] ?? 'us-east-1',
                    'url' => $settings['aws_url'] ?? '',
                    'endpoint' => $settings['aws_endpoint'] ?? '',
                ],
                'wasabi' => [
                    'key' => $settings['wasabi_access_key'] ?? '',
                    'secret' => $settings['wasabi_secret_key'] ?? '',
                    'bucket' => $settings['wasabi_bucket'] ?? '',
                    'region' => $settings['wasabi_region'] ?? 'us-east-1',
                    'url' => $settings['wasabi_url'] ?? '',
                    'root' => $settings['wasabi_root'] ?? '',
                ]
            ];
        } catch (\Exception $e) {
            return self::getDefaultConfig();
        }
    }
    
    /**
     * Get default storage configuration
     */
    private static function getDefaultConfig(): array
    {
        return [
            'disk' => 'public',
            'allowed_file_types' => 'jpg,jpeg,png,webp,gif,pdf,doc,docx,csv,txt,zip,mp4,mp3',
            'max_file_size_mb' => 2,
            'max_file_size_kb' => 2 * 1024,
            's3' => [],
            'wasabi' => []
        ];
    }
}