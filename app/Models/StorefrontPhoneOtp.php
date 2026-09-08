<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Storefront express-checkout phone OTP.
 *
 * Tenant-safe by construction: every record carries an explicit store FK and
 * every lookup must be scoped by the server-side resolved store. Codes are
 * stored hashed (code_hash) — never plaintext — and are one-time, expiring and
 * attempt-limited.
 */
class StorefrontPhoneOtp extends Model
{
    protected $fillable = [
        'store_id',
        'phone',
        'code_hash',
        'expires_at',
        'attempts',
        'max_attempts',
        'used',
        'verified_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'used' => 'boolean',
        'attempts' => 'integer',
        'max_attempts' => 'integer',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isValid(): bool
    {
        return !$this->used && !$this->isExpired() && $this->attempts < $this->max_attempts;
    }

    public function scopeUnused($query)
    {
        return $query->where('used', false);
    }
}