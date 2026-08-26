<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $fillable = [
        'name',
        'code',
        'status'
    ];

    protected $casts = [
        'status' => 'boolean'
    ];

    protected static function booted()
    {
        static::saved(function ($country) {
            \Illuminate\Support\Facades\Cache::forget('countries_active');
            // Invalidate storefront filtered cache too
            try {
                $codes = config('storefront.supported_customer_countries', ['PSE', 'ISR', 'JOR']);
                \Illuminate\Support\Facades\Cache::forget('countries_active_storefront_' . implode('_', $codes));
            } catch (\Throwable $e) {}
        });

        static::deleted(function ($country) {
            \Illuminate\Support\Facades\Cache::forget('countries_active');
            try {
                $codes = config('storefront.supported_customer_countries', ['PSE', 'ISR', 'JOR']);
                \Illuminate\Support\Facades\Cache::forget('countries_active_storefront_' . implode('_', $codes));
            } catch (\Throwable $e) {}
        });
    }

    public function states(): HasMany
    {
        return $this->hasMany(State::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', true);
    }
}