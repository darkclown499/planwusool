<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class StoreDomain extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'domain_name',
        'is_verified',
        'ssl_status',
        'verification_token',
        'is_primary',
        'verified_at',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'is_primary' => 'boolean',
        'verified_at' => 'datetime',
    ];

    /**
     * The store that owns this domain.
     */
    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
