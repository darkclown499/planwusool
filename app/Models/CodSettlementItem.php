<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodSettlementItem extends Model
{
    protected $fillable = [
        'settlement_id',
        'cod_payment_id',
        'order_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(CodSettlement::class);
    }

    public function codPayment(): BelongsTo
    {
        return $this->belongsTo(CodPayment::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}