<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderShipment extends Model
{
    protected $fillable = [
        'store_id',
        'order_id',
        'shipping_id',
        'courier_integration_id',
        'provider',
        'external_id',
        'tracking_number',
        'tracking_url',
        'label_url',
        'status',
        'provider_status',
        'payload_snapshot',
        'last_error',
        'attempt_count',
        'submitted_at',
        'delivered_at',
    ];

    protected $casts = [
        'payload_snapshot' => 'array',
        'submitted_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_CREATED = 'created';
    public const STATUS_PICKED_UP = 'picked_up';
    public const STATUS_IN_TRANSIT = 'in_transit';
    public const STATUS_OUT_FOR_DELIVERY = 'out_for_delivery';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED = 'failed';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_CANCELLED = 'cancelled';

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function shipping(): BelongsTo
    {
        return $this->belongsTo(Shipping::class);
    }

    public function courierIntegration(): BelongsTo
    {
        return $this->belongsTo(StoreCourierIntegration::class, 'courier_integration_id');
    }
}
