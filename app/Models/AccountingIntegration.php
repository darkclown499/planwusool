<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingIntegration extends Model
{
    protected $fillable = [
        'user_id',
        'store_id',
        'base_url',
        'api_key',
        'sync_orders',
        'sync_inventory',
        'last_sync_at',
        'last_sync_status',
        'last_sync_error',
        'is_active',
    ];

    protected $casts = [
        'sync_orders' => 'boolean',
        'sync_inventory' => 'boolean',
        'is_active' => 'boolean',
        'last_sync_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
