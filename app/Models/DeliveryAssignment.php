<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryAssignment extends Model
{
    public const STATUS_UNASSIGNED = 'unassigned';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_PICKED_UP = 'picked_up';
    public const STATUS_OUT_FOR_DELIVERY = 'out_for_delivery';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_DELIVERY_FAILED = 'delivery_failed';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'store_id',
        'order_id',
        'driver_id',
        'zone_id',
        'zone_name_snapshot',
        'delivery_fee_snapshot',
        'delivery_status',
        'fail_reason',
        'cancel_reason',
        'assigned_by_user_id',
        'assigned_at',
        'picked_up_at',
        'out_for_delivery_at',
        'delivered_at',
        'failed_at',
        'returned_at',
        'cancelled_at',
    ];

    protected $casts = [
        'delivery_fee_snapshot' => 'float',
        'assigned_at' => 'datetime',
        'picked_up_at' => 'datetime',
        'out_for_delivery_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
        'returned_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DeliveryDriver::class, 'driver_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'zone_id');
    }

    public function isTerminal(): bool
    {
        return in_array($this->delivery_status, [
            self::STATUS_DELIVERED,
            self::STATUS_DELIVERY_FAILED,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ], true);
    }
}
