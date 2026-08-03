<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodPaymentHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'cod_payment_id',
        'amount',
        'payment_method',
        'collected_by_name',
        'collected_by_user_id',
        'reference',
        'notes',
        'collected_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'collected_at' => 'datetime',
    ];

    /**
     * The COD payment this history entry belongs to.
     */
    public function codPayment(): BelongsTo
    {
        return $this->belongsTo(CodPayment::class, 'cod_payment_id');
    }

    /**
     * The admin user who recorded this collection (if any).
     */
    public function collectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by_user_id');
    }
}

