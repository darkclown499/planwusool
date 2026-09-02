<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryDriver extends Model
{
    protected $fillable = [
        'store_id',
        'name',
        'phone',
        'active',
        'notes',
        'vehicle_info',
        'code',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(DeliveryAssignment::class, 'driver_id');
    }
}
