<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'session_id',
        'endpoint',
        'public_key',
        'auth_token',
        'content_encoding',
        'device_name',
        'browser',
        'platform',
        'user_agent',
        'is_active',
        'expires_at',
        'last_notified_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
        'last_notified_at' => 'datetime',
    ];

    /**
     * Get the store that owns the subscription.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the customer that owns the subscription (if registered).
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Scope a query to only active subscriptions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Deactivate the subscription.
     */
    public function deactivate(): void
    {
        if ($this->is_active) {
            $this->update(['is_active' => false]);
        }
    }

    /**
     * Reactivate the subscription.
     */
    public function reactivate(): void
    {
        if (!$this->is_active) {
            $this->update(['is_active' => true]);
        }
    }

    /**
     * Delete a subscription by its endpoint (used when browser unsubscribes).
     */
    public static function deleteByEndpoint(string $endpoint): void
    {
        static::where('endpoint', $endpoint)->delete();
    }
}

