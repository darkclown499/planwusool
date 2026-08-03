<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponUsage extends Model
{
    protected $fillable = [
        'coupon_id',
        'order_id',
        'customer_id',
        'customer_identifier', // رقم الهاتف أو البريد الإلكتروني للزائر غير المسجل
        'discount_amount',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
    ];

    /**
     * The advanced coupon this usage belongs to.
     */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(AdvancedCoupon::class, 'coupon_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}

