<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreErpConfig extends Model
{
    use HasFactory;

    public const PROVIDERS = ['odoo', 'al_shamel', 'custom'];
    public const INTERVALS = ['realtime', 'hourly', 'daily'];

    protected $table = 'store_erp_configs';

    protected $fillable = [
        'store_id',
        'provider',
        'name',
        'api_endpoint',
        'api_key',
        'api_username',
        'api_password',
        'sync_settings',
        'auto_sync_interval',
        'is_active',
        'last_sync_at',
        'last_sync_status',
        'last_sync_error',
    ];

    protected $casts = [
        'sync_settings' => 'array',
        'is_active' => 'boolean',
        'last_sync_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
        'api_password',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ProductSyncLog::class, 'store_id', 'store_id')->latest('synced_at');
    }

    public function syncSettings(): array
    {
        return array_merge([
            'sync_quantity' => true,
            'sync_prices' => true,
            'sync_images' => true,
            'sync_product_details' => true,
            'sync_orders' => false,
        ], $this->sync_settings ?? []);
    }

    public function providerLabel(): string
    {
        return [
            'odoo' => 'Odoo',
            'al_shamel' => 'Al-Shamel (الشامل)',
            'custom' => 'Webhook / JSON API',
        ][$this->provider] ?? $this->provider;
    }
}