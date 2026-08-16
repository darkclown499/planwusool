<?php

namespace App\Models;

use App\Models\Concerns\EncryptsSensitiveSettings;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Setting extends BaseModel
{
    use HasFactory;
    use EncryptsSensitiveSettings;

    protected $fillable = [
        'user_id',
        'store_id',
        'key',
        'value',
    ];

    /**
     * Get the user that owns the setting.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the store that owns the setting.
     */
    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get settings for user (global if store_id is null, store-specific if provided)
     */
    public static function getUserSettings($userId, $storeId = null)
    {
        if (!$userId) {
            return [];
        }

        return \Illuminate\Support\Facades\Cache::remember(
            'user_settings.' . $userId . '.' . ($storeId ?? 'global'),
            300,
            function () use ($userId, $storeId) {
                // Use ->get() before ->pluck() so the getValueAttribute accessor
                // runs and encrypted values are decrypted. A raw query-builder
                // pluck bypasses the model accessor and returns ciphertext.
                $query = self::where('user_id', $userId);

                if ($storeId !== null) {
                    $query->where('store_id', $storeId);
                } else {
                    // Global settings are stored with store_id = NULL; a plain
                    // ->where('store_id', null) never matches in SQL.
                    $query->whereNull('store_id');
                }

                return $query->get(['key', 'value'])
                            ->pluck('value', 'key')
                            ->toArray();
            }
        );
    }

    /**
     * Forget the cached settings for a user/store.
     */
    public static function forgetUserSettings($userId, $storeId = null)
    {
        \Illuminate\Support\Facades\Cache::forget('user_settings.' . $userId . '.' . ($storeId ?? 'global'));
    }

    /**
     * Get a specific setting value
     */
    public static function getSetting($key, $userId, $storeId = null, $default = null)
    {
        $setting = self::where('user_id', $userId)
                      ->where('store_id', $storeId)
                      ->where('key', $key)
                      ->first();
        
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value
     */
    public static function setSetting($key, $value, $userId, $storeId = null)
    {
        $result = self::updateOrCreate(
            ['user_id' => $userId, 'store_id' => $storeId, 'key' => $key],
            ['value' => $value]
        );
        self::forgetUserSettings($userId, $storeId);
        return $result;
    }
}
