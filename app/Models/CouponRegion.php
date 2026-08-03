<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponRegion extends Model
{
    protected $fillable = [
        'coupon_id',
        'country_id',
        'state_id',
        'city_id',
    ];

    /**
     * The advanced coupon this region belongs to.
     */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(AdvancedCoupon::class, 'coupon_id');
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}

