<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreCourierConnectionRequest extends Model
{
    protected $fillable = [
        'store_id',
        'user_id',
        'provider',
        'display_name',
        'contact_name',
        'phone',
        'email',
        'has_existing_account',
        'account_number',
        'notes',
        'status',
    ];

    protected $casts = [
        'has_existing_account' => 'boolean',
    ];

    public const STATUSES = ['new','contacted','waiting_provider','credentials_received','configured','rejected'];

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
