<?php

namespace App\Services\Utility;

use App\Models\Currency;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class UtilityService
{
    /**
     * Get the total cache size in MB
     */
    public function getCacheSize(): string
    {
        $file_size = 0;
        $framework_path = storage_path('framework');

        if (is_dir($framework_path)) {
            foreach (\File::allFiles($framework_path) as $file) {
                $file_size += $file->getSize();
            }
        }

        return number_format($file_size / 1000000, 2);
    }

    /**
     * Format date time using settings
     */
    public function formatDateTime($date, $includeTime = true)
    {
        if (!$date) {
            return null;
        }

        $settings = app(\App\Services\Settings\SettingsService::class)->settings();

        $dateFormat = $settings['dateFormat'] ?? 'Y-m-d';
        $timeFormat = $settings['timeFormat'] ?? 'H:i';
        $timezone = $settings['defaultTimezone'] ?? config('app.timezone', 'UTC');

        $format = $includeTime ? "$dateFormat $timeFormat" : $dateFormat;

        return Carbon::parse($date)->timezone($timezone)->format($format);
    }

    /**
     * Get Wusool application version
     */
    public function getWusoolVersion(): string
    {
        return '1.0.0';
    }

    /**
     * Get basic Wusool statistics
     */
    public function getWusoolStats(): array
    {
        try {
            return [
                'total_companies' => \App\Models\User::where('type', 'company')->count(),
                'total_stores' => \App\Models\Store::count(),
                'active_stores' => \App\Models\Store::count(),
                'total_plans' => \App\Models\Plan::count(),
                'active_plans' => \App\Models\Plan::where('is_plan_enable', 'on')->count(),
            ];
        } catch (\Exception $e) {
            return [
                'total_companies' => 0,
                'total_stores' => 0,
                'active_stores' => 0,
                'total_plans' => 0,
                'active_plans' => 0,
            ];
        }
    }

    /**
     * Sanitize a value so it only contains valid UTF-8 characters.
     */
    public function cleanUtf8($value)
    {
        if (!is_string($value) || $value === '' || mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }
        // Drop invalid byte sequences, keeping valid UTF-8 characters intact.
        $cleaned = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
        return $cleaned === false ? '' : $cleaned;
    }

    /**
     * Recursively sanitize all string attributes (and loaded relations) of a model
     * so its JSON serialization never fails on malformed UTF-8.
     */
    public function sanitizeModelUtf8($model)
    {
        if ($model instanceof \Illuminate\Database\Eloquent\Model) {
            foreach ($model->getAttributes() as $key => $value) {
                if (is_string($value)) {
                    $model->{$key} = $this->cleanUtf8($value);
                }
            }
            foreach ($model->getRelations() as $relation => $related) {
                if ($related instanceof \Illuminate\Database\Eloquent\Model) {
                    $model->setRelation($relation, $this->sanitizeModelUtf8($related));
                } elseif ($related instanceof \Illuminate\Support\Collection) {
                    $model->setRelation($relation, $related->map(fn ($item) => $this->sanitizeModelUtf8($item)));
                }
            }
        } elseif ($model instanceof \Illuminate\Support\Collection || $model instanceof \Illuminate\Database\Eloquent\Collection) {
            $model->transform(fn ($item) => $this->sanitizeModelUtf8($item));
        }
        return $model;
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
     */
    public function getSchemeAwareStorageUrl($path = ''): string
    {
        $baseUrl = rtrim($this->getSchemeAwareUrl(), '/');
        if ($path) {
            return $baseUrl . '/' . ltrim($path, '/');
        }
        return $baseUrl;
    }

    /**
     * Get the base domain from APP_URL
     */
    public function getBaseDomain(): string
    {
        return parse_url(config('app.url'), PHP_URL_HOST) ?? 'wusool.ps';
    }

    /**
     * Get the full subdomain URL for a store
     */
    public function getSubdomainUrl($slug): string
    {
        $baseDomain = $this->getBaseDomain();
        return "https://{$slug}.{$this->getBaseDomain()}";
    }
}