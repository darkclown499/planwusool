<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerEmailOtp extends Model
{
    protected $fillable = [
        'customer_id',
        'store_id',
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

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

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
