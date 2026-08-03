<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'type',
        'title',
        'body',
        'icon',
        'image_url',
        'action_url',
        'data',
        'related_id',
        'related_type',
        'channel',
        'is_sent',
        'sent_at',
        'read_at',
        'clicked_at',
        'is_read',
    ];

    protected $casts = [
        'data' => 'array',
        'is_sent' => 'boolean',
        'is_read' => 'boolean',
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'clicked_at' => 'datetime',
    ];

    /**
     * أنواع الإشعارات المدعومة في النظام.
     */
    public const TYPES = [
        'welcome' => 'welcome',
        'order_confirmed' => 'order_confirmed',
        'order_shipped' => 'order_shipped',
        'order_delivered' => 'order_delivered',
        'order_cancelled' => 'order_cancelled',
        'review_reply' => 'review_reply',
        'back_in_stock' => 'back_in_stock',
        'price_drop' => 'price_drop',
        'abandoned_cart_reminder' => 'abandoned_cart_reminder',
        'loyalty_earned' => 'loyalty_earned',
        'loyalty_redeemed' => 'loyalty_redeemed',
        'offer_promo' => 'offer_promo',
        'custom' => 'custom',
    ];

    /**
     * قنوات الإشعارات المدعومة.
     */
    public const CHANNELS = [
        'in_app' => 'in_app',
        'push' => 'push',
        'email' => 'email',
        'sms' => 'sms',
    ];

    /**
     * Get the store that owns the notification.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the customer that owns the notification.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the related model (order, product, review, etc).
     */
    public function related()
    {
        return $this->morphTo('related', 'related_type', 'related_id');
    }

    /**
     * Scope a query to only unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope a query to only sent notifications.
     */
    public function scopeSent($query)
    {
        return $query->where('is_sent', true);
    }

    /**
     * Scope a query to notifications for a given type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Mark the notification as read.
     */
    public function markAsRead(): void
    {
        if (!$this->is_read) {
            $this->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        }
    }

    /**
     * Mark the notification as sent.
     */
    public function markAsSent(): void
    {
        if (!$this->is_sent) {
            $this->update([
                'is_sent' => true,
                'sent_at' => now(),
            ]);
        }
    }

    /**
     * Mark the notification as clicked.
     */
    public function markAsClicked(): void
    {
        if (!$this->clicked_at) {
            $this->update(['clicked_at' => now()]);
        }
    }
}

