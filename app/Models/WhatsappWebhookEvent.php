<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappWebhookEvent extends Model
{
    protected $fillable = [
        'event_id',
        'store_id',
        'provider_message_id',
        'status',
        'payload',
        'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed_at' => 'datetime',
    ];

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
}
