<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreCourierIntegration extends Model
{
    protected $fillable = [
        'store_id',
        'provider',
        'display_name',
        'credentials',
        'settings',
        'status',
        'last_error',
        'last_tested_at',
        'auto_submit_orders',
        'auto_sync_status',
        'is_active',
    ];

    protected $casts = [
        'credentials' => 'encrypted:array',
        'settings' => 'array',
        'last_tested_at' => 'datetime',
        'auto_submit_orders' => 'boolean',
        'auto_sync_status' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'credentials',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function scopeForStore($query, int $storeId)
    {
        return $query->where('store_id', $storeId);
    }

    public function getMaskedCredentialsAttribute(): array
    {
        $creds = $this->credentials ?? [];
        $masked = [];
        foreach ($creds as $k => $v) {
            if (empty($v)) {
                $masked[$k] = '';
            } else {
                $str = (string) $v;
                $masked[$k] = str_repeat('•', min(8, strlen($str)));
            }
        }
        return $masked;
    }

    public function isConnected(): bool
    {
        return $this->status === 'connected' && $this->is_active;
    }
}
