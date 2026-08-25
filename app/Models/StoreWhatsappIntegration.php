<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreWhatsappIntegration extends Model
{
    protected $fillable = [
        'store_id',
        'provider',
        'access_token',
        'phone_number_id',
        'waba_id',
        'business_phone',
        'notification_phone',
        'is_enabled',
        'connection_status',
        'last_verified_at',
        'last_error',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'is_enabled' => 'boolean',
        'last_verified_at' => 'datetime',
    ];

    protected $hidden = [
        'access_token',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function isConnected(): bool
    {
        return $this->connection_status === 'connected' && $this->is_enabled;
    }

    public function maskedToken(): string
    {
        if (!$this->access_token) return '';
        $len = strlen($this->access_token);
        if ($len <= 8) return str_repeat('*', $len);
        return substr($this->access_token, 0, 4) . str_repeat('*', $len - 8) . substr($this->access_token, -4);
    }
}
