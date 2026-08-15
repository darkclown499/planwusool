<?php

namespace App\Services\SensitiveData;

use Illuminate\Support\Facades\Config;

class SensitiveDataService
{
    /**
     * Get the list of sensitive keys that should be masked/filtered
     * before being sent to frontend views or JavaScript.
     */
    public function getSensitiveKeys(): array
    {
        return array_merge(
            Config::get('sensitive-keys', []),
            [
                'telegram_bot_token',
                'telegram_chat_id',
                'whatsapp_number',
                'messaging_message_template',
                'messaging_item_template',
            ]
        );
    }

    /**
     * Remove sensitive keys from a settings array before passing to
     * the frontend. Useful for Inertia shared props and JSON API responses.
     */
    public function filterSensitiveSettings(array $settings): array
    {
        $sensitiveKeys = $this->getSensitiveKeys();

        return array_filter(
            $settings,
            fn ($key) => ! in_array($key, $sensitiveKeys, true),
            ARRAY_FILTER_USE_KEY
        );
    }

    /**
     * Return a copy of the settings array where sensitive values are
     * masked (replaced with '*************'). Non-sensitive values
     * are passed through unchanged.
     */
    public function getMaskedSettings(array $settings): array
    {
        $sensitiveKeys = $this->getSensitiveKeys();

        foreach ($settings as $key => $value) {
            if (in_array($key, $sensitiveKeys, true)) {
                $settings[$key] = '*************';
            }
        }

        return $settings;
    }
}