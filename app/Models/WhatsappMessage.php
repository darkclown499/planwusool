<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappMessage extends Model
{
    protected $fillable = [
        'store_id',
        'order_id',
        'abandoned_cart_id',
        'recipient_phone',
        'provider',
        'provider_message_id',
        'direction',
        'message_type',
        'status',
        'template_name',
        'last_error',
        'sent_at',
        'delivered_at',
        'read_at',
        'failed_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    public const STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed'];

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function abandonedCart(): BelongsTo { return $this->belongsTo(AbandonedCart::class, 'abandoned_cart_id'); }

    public static function mapMetaStatus(string $metaStatus): ?string
    {
        $map = [
            'sent' => 'sent',
            'delivered' => 'delivered',
            'read' => 'read',
            'failed' => 'failed',
        ];
        return $map[strtolower($metaStatus)] ?? null;
    }
}
