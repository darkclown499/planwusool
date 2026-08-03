<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'type',
        'email_enabled',
        'push_enabled',
        'sms_enabled',
        'in_app_enabled',
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
        'push_enabled' => 'boolean',
        'sms_enabled' => 'boolean',
        'in_app_enabled' => 'boolean',
    ];

    /**
     * Get the store that owns the preference.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the customer that owns the preference.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get or create default preferences for a customer on a type.
     */
    public static function getForCustomer(int $storeId, int $customerId, string $type): self
    {
        return static::firstOrCreate(
            [
                'store_id' => $storeId,
                'customer_id' => $customerId,
                'type' => $type,
            ],
            [
                'email_enabled' => true,
                'push_enabled' => true,
                'sms_enabled' => false,
                'in_app_enabled' => true,
            ]
        );
    }

    /**
     * Check if a customer has opted in for a given type/channel.
     */
    public static function isEnabled(int $storeId, int $customerId, string $type, string $channel): bool
    {
        $pref = static::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->where('type', $type)
            ->first();

        if (!$pref) {
            // Default: email, push, in_app enabled; sms disabled
            return $channel !== 'sms';
        }

        return (bool) $pref->{$channel . '_enabled'};
    }

    /**
     * Enable or disable all notification types for a customer.
     * Used when a customer unsubscribes from all notifications.
     */
    public static function unsubscribeAll(int $storeId, int $customerId): void
    {
        static::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->update([
                'email_enabled' => false,
                'push_enabled' => false,
                'sms_enabled' => false,
                'in_app_enabled' => false,
            ]);
    }
}

