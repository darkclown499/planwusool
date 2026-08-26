<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreEmailLog extends Model
{
    protected $fillable = [
        'store_id','customer_id','order_id','shipment_id','type','recipient','status','provider_message_id','attempt_count','last_error','sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'attempt_count' => 'integer',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
}
