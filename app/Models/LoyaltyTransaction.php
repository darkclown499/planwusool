<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'order_id',
        'type',
        'points',
        'balance_after',
        'description',
        'metadata',
        'expires_at',
    ];

    protected $casts = [
        'points' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
        'expires_at' => 'datetime',
    ];

    public const TYPES = [
        'earn' => 'earn',
        'redeem' => 'redeem',
        'signup_bonus' => 'signup_bonus',
        'review_bonus' => 'review_bonus',
        'adjustment' => 'adjustment',
        'expired' => 'expired',
        'refund' => 'refund',
    ];

    /**
     * Get the store that owns the transaction.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the customer that owns the transaction.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the order that owns the transaction.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the current points balance for a customer within a store.
     */
    public static function balanceFor(int $storeId, int $customerId): float
    {
        return (float) static::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->sum('points');
    }
}

