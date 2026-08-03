<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'store_id',
        'type',
        'title',
        'body',
        'icon',
        'color',
        'action_url',
        'related_id',
        'related_type',
        'data',
        'is_read',
        'read_at',
        'is_urgent',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'is_urgent' => 'boolean',
        'read_at' => 'datetime',
    ];

    /**
     * أنواع إشعارات التاجر المدعومة.
     */
    public const TYPES = [
        'new_order' => 'new_order',
        'order_status_changed' => 'order_status_changed',
        'order_cancelled' => 'order_cancelled',
        'low_stock' => 'low_stock',
        'out_of_stock' => 'out_of_stock',
        'new_review' => 'new_review',
        'plan_expiring' => 'plan_expiring',
        'plan_request' => 'plan_request',
        'plan_approved' => 'plan_approved',
        'cod_collected' => 'cod_collected',
        'abandoned_cart' => 'abandoned_cart',
        'system' => 'system',
    ];

    /**
     * الألوان الافتراضية لكل نوع إشعار.
     */
    public const TYPE_COLORS = [
        'new_order' => 'green',
        'order_status_changed' => 'blue',
        'order_cancelled' => 'red',
        'low_stock' => 'amber',
        'out_of_stock' => 'red',
        'new_review' => 'purple',
        'plan_expiring' => 'amber',
        'plan_request' => 'blue',
        'plan_approved' => 'green',
        'cod_collected' => 'green',
        'abandoned_cart' => 'yellow',
        'system' => 'gray',
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the store associated with the notification.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Scope a query to only unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope a query to urgent notifications.
     */
    public function scopeUrgent($query)
    {
        return $query->where('is_urgent', true);
    }

    /**
     * Scope a query to notifications of a given type.
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
     * Get the default color for a notification type.
     */
    public static function getColorForType(string $type): string
    {
        return self::TYPE_COLORS[$type] ?? 'gray';
    }
}
