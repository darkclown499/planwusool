<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSyncLog extends Model
{
    use HasFactory;

    protected $table = 'product_sync_logs';

    protected $fillable = [
        'store_id',
        'provider',
        'entity_type',
        'reference',
        'status',
        'message',
        'payload',
        'synced_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'synced_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public static function record(
        $storeId,
        string $provider,
        string $entityType,
        ?string $reference,
        string $status,
        ?string $message = null,
        ?array $payload = null
    ): self {
        return self::create([
            'store_id' => $storeId,
            'provider' => $provider,
            'entity_type' => $entityType,
            'reference' => $reference,
            'status' => $status,
            'message' => $message,
            'payload' => $payload,
            'synced_at' => now(),
        ]);
    }
}