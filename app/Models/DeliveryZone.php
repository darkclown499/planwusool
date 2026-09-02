<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryZone extends Model
{
    protected $fillable = [
        'store_id',
        'name',
        'description',
        'fee',
        'is_active',
        'sort_order',
        'est_time_text',
        'free_delivery_threshold',
        'min_order_amount',
    ];

    protected $casts = [
        'fee' => 'float',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'free_delivery_threshold' => 'float',
        'min_order_amount' => 'float',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class, 'zone_id');
    }

    /**
     * Resolve the effective delivery fee for a given subtotal.
     * Applies the free-delivery threshold when a subtotal qualifies.
     */
    public function feeForSubtotal(float $subtotal): float
    {
        if ($this->free_delivery_threshold !== null
            && (float) $this->free_delivery_threshold > 0
            && $subtotal >= (float) $this->free_delivery_threshold) {
            return 0.0;
        }

        return (float) $this->fee;
    }

    public function isEligibleForSubtotal(float $subtotal): bool
    {
        if ($this->min_order_amount !== null
            && (float) $this->min_order_amount > 0
            && $subtotal < (float) $this->min_order_amount) {
            return false;
        }

        return true;
    }
}
