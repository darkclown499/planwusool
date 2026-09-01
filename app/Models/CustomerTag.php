<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Lightweight per-store merchant tag attached to an identity reference.
 *
 * Always tenant-scoped: every row carries store_id and unique
 * (store_id, customer_ref, name). Store A tags can never appear in Store B.
 */
class CustomerTag extends Model
{
    protected $fillable = [
        'store_id',
        'customer_ref',
        'name',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}