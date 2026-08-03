<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbandonedCart extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'session_id',
        'customer_id',
        'customer_email',
        'customer_phone',
        'customer_name',
        'cart_items',
        'cart_total',
        'status',
        'last_activity_at',
        'reminder_sent_at',
        'recovered_at',
        'recovered_order_id',
        'reminder_count',
    ];

    protected $casts = [
        'cart_items' => 'array',
        'cart_total' => 'decimal:2',
        'last_activity_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'recovered_at' => 'datetime',
        'reminder_count' => 'integer',
    ];

    public const STATUSES = [
        'new' => 'new',
        'reminder_sent' => 'reminder_sent',
        'recovered' => 'recovered',
        'expired' => 'expired',
        'unsubscribed' => 'unsubscribed',
    ];

    /**
     * Get the store that owns the abandoned cart.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the customer that owns the abandoned cart.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the recovered order.
     */
    public function recoveredOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'recovered_order_id');
    }

    /**
     * Scope a query to carts that are candidates for a reminder.
     */
    public function scopePendingReminder($query, int $storeId, int $hours = 24)
    {
        return $query->where('store_id', $storeId)
            ->whereIn('status', [self::STATUSES['new'], self::STATUSES['reminder_sent']])
            ->whereNotNull('customer_email')
            ->where('last_activity_at', '<=', now()->subHours($hours))
            ->where(function ($q) {
                $q->whereNull('reminder_sent_at')
                    ->orWhere('reminder_sent_at', '<=', now()->subHours($hours));
            });
    }
}

