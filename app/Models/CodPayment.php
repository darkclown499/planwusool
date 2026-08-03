<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'store_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'total_amount',
        'cod_fee',
        'amount_collected',
        'amount_remaining',
        'status',
        'delivery_company',
        'delivery_tracking_number',
        'notes',
        'collected_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'cod_fee' => 'decimal:2',
        'amount_collected' => 'decimal:2',
        'amount_remaining' => 'decimal:2',
        'collected_at' => 'datetime',
    ];

    /**
     * The order this COD payment belongs to.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * The store that owns this COD payment.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * The customer associated with this COD payment.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * The collection history (partial payments) for this COD payment.
     */
    public function history(): HasMany
    {
        return $this->hasMany(CodPaymentHistory::class, 'cod_payment_id');
    }

    /**
     * Helper: is the payment fully collected?
     */
    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Helper: is the payment partially collected?
     */
    public function isPartial(): bool
    {
        return $this->status === 'partial';
    }

    /**
     * Helper: is still pending collection?
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Get the amount collected as a float.
     */
    public function getCollectedAmount(): float
    {
        return (float) $this->amount_collected;
    }

    /**
     * Get the remaining amount as a float.
     */
    public function getRemainingAmount(): float
    {
        return (float) $this->amount_remaining;
    }
}

