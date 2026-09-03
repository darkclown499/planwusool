<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * A dedicated Point-of-Sale terminal / cashier device.
 *
 * Deliberately a SEPARATE authenticatable from the merchant User, so a cashier
 * who authenticates on the `pos_terminal` guard can NEVER enter the merchant
 * dashboard, settings or admin pages (those live on the `web` guard only).
 * The credential is stored only as a bcrypt hash (pin_hash); the raw PIN is
 * never persisted and never placed in any URL.
 */
class PosTerminal extends Authenticatable
{
    protected $fillable = [
        'store_id',
        'name',
        'username',
        'pin_hash',
        'terminal_code',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'pin_hash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Password stored for the auth guard is the terminal's hashed PIN.
     */
    public function getAuthPassword(): string
    {
        return $this->pin_hash;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
