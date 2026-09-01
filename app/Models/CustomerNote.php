<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Merchant-internal CRM note attached to an identity reference.
 *
 * The note is scoped by store_id AND customer_ref. It is only ever surfaced
 * through the merchant dashboard — it must never be exposed on any storefront
 * prop, customer account API, or public route.
 */
class CustomerNote extends Model
{
    protected $fillable = [
        'store_id',
        'customer_ref',
        'note',
        'created_by',
    ];

    protected $casts = [
        'created_by' => 'integer',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}